package com.yzprojecttw.beastidal;

import android.app.Activity;
import android.content.ContentValues;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.Toast;

import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

// Beastidal for Android: a full-screen, landscape WebView of the live game. The game itself (and its offline cache,
// via the service worker) comes from the website, so the app always runs the current release.
public class MainActivity extends Activity {
    static final String HOST = "beastidal.yzprojecttw.com";
    static final String HOME = "https://" + HOST + "/";
    static final int PICK_FILE = 41;

    FrameLayout root;
    WebView web;
    ValueCallback<Uri[]> pending;

    @Override
    protected void onCreate(Bundle saved) {
        super.onCreate(saved);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        root = new FrameLayout(this);
        root.setBackgroundColor(0xFF071A20);
        setContentView(root);
        createWebView();
        if (saved != null) web.restoreState(saved);
        else web.loadUrl(HOME);
    }

    void createWebView() {
        web = new WebView(this);
        web.setBackgroundColor(0xFF071A20);
        root.addView(web, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setLoadWithOverviewMode(true);
        s.setUseWideViewPort(true);
        s.setSupportZoom(false);
        s.setBuiltInZoomControls(false);
        s.setAllowFileAccess(false);
        s.setUserAgentString(s.getUserAgentString() + " BeastidalApp/" + BuildConfig.VERSION + " (Android)");
        web.addJavascriptInterface(new Bridge(), "BeastidalApp");
        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r) {
                Uri u = r.getUrl();
                if (HOST.equals(u.getHost()) && !u.getPath().startsWith("/download/")) return false;
                // other sites, and the download pages, open in the phone's browser
                try {
                    startActivity(new Intent(Intent.ACTION_VIEW, u));
                } catch (Exception ignored) {
                }
                return true;
            }

            @Override
            public void onReceivedError(WebView v, WebResourceRequest r, WebResourceError e) {
                if (r.isForMainFrame()) showOffline();
            }

            @Override
            public boolean onRenderProcessGone(WebView v, RenderProcessGoneDetail d) {
                // the GPU/renderer process died (low memory): rebuild the WebView instead of crashing the app
                root.removeView(web);
                web.destroy();
                createWebView();
                web.loadUrl(HOME);
                return true;
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView v, ValueCallback<Uri[]> cb, FileChooserParams p) {
                if (pending != null) pending.onReceiveValue(null);
                pending = cb;
                Intent i = new Intent(Intent.ACTION_GET_CONTENT);
                i.addCategory(Intent.CATEGORY_OPENABLE);
                i.setType("*/*");
                try {
                    startActivityForResult(Intent.createChooser(i, "選擇存檔"), PICK_FILE);
                } catch (Exception e) {
                    pending = null;
                    return false;
                }
                return true;
            }

            @Override
            public void onPermissionRequest(PermissionRequest r) {
                r.deny();
            }
        });
    }

    void showOffline() {
        String html = "<!doctype html><meta name=viewport content='width=device-width,initial-scale=1'>"
                + "<body style='margin:0;height:100vh;display:grid;place-items:center;background:#071a20;color:#e6f2ed;"
                + "font:16px/1.7 sans-serif;text-align:center'><div><h2 style='margin:0 0 8px'>連不上海面</h2>"
                + "<p style='margin:0 0 20px;color:#9dbdb6'>第一次開啟需要網路；玩過一次後，離線也能進入。</p>"
                + "<button onclick=\"location.href='" + HOME + "'\" style='padding:12px 28px;border:0;border-radius:12px;"
                + "background:#9ce8d1;color:#062027;font-weight:700;font-size:16px'>重試</button></div></body>";
        web.loadDataWithBaseURL(null, html, "text/html", "utf-8", null);
    }

    @Override
    protected void onActivityResult(int req, int res, Intent data) {
        if (req == PICK_FILE && pending != null) {
            Uri u = res == RESULT_OK && data != null ? data.getData() : null;
            pending.onReceiveValue(u == null ? null : new Uri[] { u });
            pending = null;
            return;
        }
        super.onActivityResult(req, res, data);
    }

    // Called from the page (window.BeastidalApp): save exports go to the phone's Downloads folder.
    class Bridge {
        @JavascriptInterface
        public boolean saveFile(String name, String text) {
            try {
                byte[] bytes = text.getBytes(StandardCharsets.UTF_8);
                if (Build.VERSION.SDK_INT >= 29) {
                    ContentValues cv = new ContentValues();
                    cv.put(MediaStore.Downloads.DISPLAY_NAME, name);
                    cv.put(MediaStore.Downloads.MIME_TYPE, "application/json");
                    cv.put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/Beastidal");
                    Uri u = getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, cv);
                    if (u == null) return false;
                    try (OutputStream o = getContentResolver().openOutputStream(u)) {
                        o.write(bytes);
                    }
                } else {
                    Intent i = new Intent(Intent.ACTION_SEND);
                    i.setType("application/json");
                    i.putExtra(Intent.EXTRA_SUBJECT, name);
                    i.putExtra(Intent.EXTRA_TEXT, text);
                    runOnUiThread(() -> startActivity(Intent.createChooser(i, name)));
                }
                runOnUiThread(() -> Toast.makeText(MainActivity.this, "已存到「下載/Beastidal」", Toast.LENGTH_SHORT).show());
                return true;
            } catch (Exception e) {
                return false;
            }
        }

        @JavascriptInterface
        public String version() {
            return BuildConfig.VERSION;
        }
    }

    @Override
    public void onBackPressed() {
        // let the game close its open panel first (it answers true when it handled the back press)
        web.evaluateJavascript("(window.__appBack ? !!window.__appBack() : false)", r -> {
            if (!"true".equals(r)) moveTaskToBack(true);
        });
    }

    @Override
    public void onWindowFocusChanged(boolean focus) {
        super.onWindowFocusChanged(focus);
        if (focus) immersive();
    }

    @SuppressWarnings("deprecation")
    void immersive() {
        Window w = getWindow();
        if (Build.VERSION.SDK_INT >= 30) {
            w.setDecorFitsSystemWindows(false);
            WindowInsetsController c = w.getInsetsController();
            if (c != null) {
                c.hide(WindowInsets.Type.systemBars());
                c.setSystemBarsBehavior(WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
            }
        } else {
            w.getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY | View.SYSTEM_UI_FLAG_FULLSCREEN
                    | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                    | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN);
        }
    }

    @Override
    protected void onPause() {
        super.onPause();
        web.onPause();
    }

    @Override
    protected void onResume() {
        super.onResume();
        web.onResume();
        immersive();
    }

    @Override
    protected void onSaveInstanceState(Bundle out) {
        super.onSaveInstanceState(out);
        web.saveState(out);
    }

    @Override
    protected void onDestroy() {
        if (web != null) web.destroy();
        super.onDestroy();
    }
}
