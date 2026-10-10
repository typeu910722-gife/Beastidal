import { EXPLORE, STAGES, normalizeExpansion, commandPet, upgradeBoat, awaken } from './expansion.js?v=0.14.0';
let tab = 'beasts',
  page = 0;
const esc = s =>
  String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
export function renderAdventure(body, s, ctx) {
  normalizeExpansion(s);
  const e = s.expedition;
  body.innerHTML = `<div class="tabs"><button data-exp-tab="beasts" class="${tab === 'beasts' ? 'active' : ''}">御獸夥伴</button><button data-exp-tab="voyage" class="${tab === 'voyage' ? 'active' : ''}">航務與遺跡</button></div>`;
  const run = (r, close = false) => {
    ctx.toast(r.ok ? r.message : r.error, !r.ok);
    ctx.save();
    ctx.sync();
    if (r.ok && close) ctx.close();
    else ctx.refresh();
  };
  if (tab === 'beasts') {
    // three companions per page: name, bond stage, bond bar and the orders; training lives in the beast storage
    const per = innerHeight < 520 ? 2 : 4,
      pages = Math.max(1, Math.ceil(s.tamed.length / per));
    page = Math.min(Math.max(0, page), pages - 1);
    if (!s.tamed.length) body.innerHTML += '<p class="dv-note">還沒有御獸夥伴。</p>';
    for (const pet of s.tamed.slice(page * per, page * per + per)) {
      const out = e.activeId === pet.id;
      body.innerHTML += `<article class="beast-row"><div class="beast-row-head"><b>${esc(pet.name)}</b><span>${pet.awakened ? '契印覺醒' : esc(STAGES.filter(([n]) => pet.bond >= n).at(-1)[1])} · 羈絆 ${Math.floor(pet.bond)}${out ? ' · 出戰中' : ''}</span></div><div class="bond-meter"><i style="width:${pet.bond}%"></i></div><div class="beast-row-actions"><button data-pet="${pet.id}" data-order="follow">跟隨</button><button data-pet="${pet.id}" data-order="gather">協採</button><button data-pet="${pet.id}" data-order="guard">協戰</button>${out ? `<button data-pet="${pet.id}" data-order="home">回池</button>` : ''}${pet.bond >= 85 && !pet.awakened ? `<button data-awaken="${pet.id}">喚醒契印</button>` : ''}</div></article>`;
    }
    if (pages > 1)
      body.innerHTML += `<div class="bx-pager"><button type="button" data-exp-page="-1" ${page ? '' : 'disabled'}>‹</button><span>${page + 1} / ${pages}</span><button type="button" data-exp-page="1" ${page < pages - 1 ? '' : 'disabled'}>›</button></div>`;
  } else {
    body.innerHTML += s.ship
      ? '<p class="dv-note">⚓ 比斯泰德號 · 掌舵時按空白鍵開砲（每發 1 廢金屬）</p>'
      : `<div class="boat-row"><span>小艇 LV ${e.boatLevel} / 3</span>${e.boatLevel < 3 ? `<button id="upgrade-boat">升級 · 木 ${12 + e.boatLevel * 8} / 金 ${8 + e.boatLevel * 6} / 晶 ${2 + e.boatLevel * 2}</button>` : ''}</div>`;
    const site = v =>
      `<button type="button" class="site-tile${e.collected.includes(v.id) ? ' done' : ''}" data-route="${v.id}" title="${v.deep ? '海底 8 公尺 · 騎乘潛水' : v.cave ? '異晶洞窟內' : v.kind === 'entrance' ? '異晶礁島 · 登岸進入' : v.kind === 'ruin' ? '沉城遺島' : '棕櫚環礁'}">${e.collected.includes(v.id) ? '✓' : '◇'} ${v.name}</button>`;
    body.innerHTML += `<div class="site-grid">${EXPLORE.filter(v => v.kind !== 'exit')
      .map(site)
      .join(
        ''
      )}<button type="button" class="site-tile boss${e.boss.defeated ? ' done' : ''}" data-route="boss">${e.boss.defeated ? '✓' : '⚠'} 深海守望者 · ${Math.max(0, Math.ceil(e.boss.hp))}</button></div>`;
  }
  body.querySelectorAll('[data-exp-page]').forEach(
    b =>
      (b.onclick = () => {
        page += Number(b.dataset.expPage);
        ctx.refresh();
      })
  );
  body.querySelectorAll('[data-exp-tab]').forEach(
    b =>
      (b.onclick = () => {
        tab = b.dataset.expTab;
        ctx.refresh();
      })
  );
  body
    .querySelectorAll('[data-pet]')
    .forEach(b => (b.onclick = () => run(commandPet(s, b.dataset.pet, b.dataset.order), true)));
  body.querySelectorAll('[data-awaken]').forEach(b => (b.onclick = () => run(awaken(s, b.dataset.awaken))));
  if (document.getElementById('upgrade-boat'))
    document.getElementById('upgrade-boat').onclick = () => run(upgradeBoat(s));
  body.querySelectorAll('[data-route]').forEach(b => (b.onclick = () => ctx.route(b.dataset.route)));
}
