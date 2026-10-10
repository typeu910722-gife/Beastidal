import { EXPLORE, STAGES, normalizeExpansion, commandPet, upgradeBoat, awaken } from './expansion.js?v=0.17.0';
import { objectives, normalizeStory } from './story.js?v=0.17.0';
let tab = 'beasts',
  page = 0,
  pick = null,
  turn = '';
const esc = s =>
  String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
export function renderAdventure(body, s, ctx) {
  normalizeExpansion(s);
  const e = s.expedition;
  normalizeStory(s);
  const story = objectives(s);
  if (tab === 'pact' && !story.length) tab = 'beasts';
  body.innerHTML = `<div class="tabs"><button data-exp-tab="beasts" class="${tab === 'beasts' ? 'active' : ''}">御獸夥伴</button><button data-exp-tab="voyage" class="${tab === 'voyage' ? 'active' : ''}">航務與遺跡</button>${story.length ? `<button data-exp-tab="pact" class="${tab === 'pact' ? 'active' : ''}">嘯岳之契</button>` : ''}</div>`;
  const run = (r, close = false) => {
    ctx.toast(r.ok ? r.message : r.error, !r.ok);
    ctx.save();
    ctx.sync();
    if (r.ok && close) ctx.close();
    else ctx.refresh();
  };
  if (tab === 'beasts') {
    // a grid of partner tiles (name, stage, bond bar); tap one and its orders appear below — no scrolling list
    const per = innerHeight < 520 ? 6 : 9,
      pages = Math.max(1, Math.ceil(s.tamed.length / per));
    page = Math.min(Math.max(0, page), pages - 1);
    if (!s.tamed.some(p => p.id === pick)) pick = e.activeId || s.tamed[0]?.id || null;
    if (!s.tamed.length) body.innerHTML += '<p class="dv-note">還沒有御獸夥伴。</p>';
    else {
      const shown = s.tamed.slice(page * per, page * per + per);
      body.innerHTML += `<div class="pet-grid${turn ? ' turn-' + turn : ''}">${Array.from({ length: per }, (_, i) => {
        const pet = shown[i];
        if (!pet) return '<span class="pet-tile empty"></span>';
        const out = e.activeId === pet.id;
        return `<button type="button" class="pet-tile${pet.id === pick ? ' active' : ''}${out ? ' out' : ''}" data-pick="${esc(pet.id)}"><b>${esc(pet.name)}</b><small>${pet.awakened ? '契印覺醒' : esc(STAGES.filter(([n]) => pet.bond >= n).at(-1)[1])} · ${Math.floor(pet.bond)}</small><i style="width:${pet.bond}%"></i>${out ? '<em>出戰</em>' : ''}</button>`;
      }).join('')}</div>`;
      turn = '';
      if (pages > 1)
        body.innerHTML += `<div class="inv-pager"><button type="button" data-exp-page="-1" ${page ? '' : 'disabled'}>‹</button><span>${page + 1} / ${pages}</span><button type="button" data-exp-page="1" ${page < pages - 1 ? '' : 'disabled'}>›</button></div>`;
      const pet = s.tamed.find(p => p.id === pick),
        out = e.activeId === pet.id;
      body.innerHTML += `<div class="pet-orders"><span>${esc(pet.name)}</span><button data-pet="${pet.id}" data-order="follow">跟隨</button><button data-pet="${pet.id}" data-order="gather">協採</button><button data-pet="${pet.id}" data-order="guard">協戰</button>${out ? `<button data-pet="${pet.id}" data-order="home">回去休息</button>` : ''}${pet.bond >= 85 && !pet.awakened ? `<button data-awaken="${pet.id}">喚醒契印</button>` : ''}</div>`;
    }
  } else if (tab === 'pact') {
    body.innerHTML += `<ul class="pact-list">${story.map(([text, done]) => `<li class="${done ? 'done' : ''}">${done ? '✓' : '○'} ${esc(text)}</li>`).join('')}</ul>`;
    if (s.story.stage >= 5)
      body.innerHTML += `<button type="button" id="pact-cross" class="primary full-button">${s.story.stage >= 6 ? '再次越嶺' : '請嘯岳帶你越過群山'}</button>`;
  } else {
    body.innerHTML += s.ship
      ? '<p class="dv-note">⚓ 比斯泰德號 · 掌舵時按空白鍵開砲（每發 1 廢金屬）</p>'
      : `<div class="boat-row"><span>小艇 LV ${e.boatLevel} / 3</span>${e.boatLevel < 3 ? `<button id="upgrade-boat">升級 · 木 ${12 + e.boatLevel * 8} / 金 ${8 + e.boatLevel * 6} / 晶 ${2 + e.boatLevel * 2}</button>` : ''}</div>`;
    const site = v =>
      `<button type="button" class="site-tile${e.collected.includes(v.id) ? ' done' : ''}" data-route="${v.id}" title="${v.deep ? '湖底遺城 · 騎乘潛水' : v.cave ? '異晶洞窟內' : v.kind === 'entrance' ? '異晶礁島 · 登岸進入' : v.kind === 'ruin' ? '沉城遺島' : '棕櫚環礁'}">${e.collected.includes(v.id) ? '✓' : '◇'} ${v.name}</button>`;
    body.innerHTML += `<div class="site-grid">${EXPLORE.filter(
      v => v.kind !== 'exit' && (!v.story || s.story.stage >= 1)
    )
      .map(site)
      .join(
        ''
      )}<button type="button" class="site-tile boss${e.boss.defeated ? ' done' : ''}" data-route="boss">${e.boss.defeated ? '✓' : '⚠'} 深海守望者 · ${Math.max(0, Math.ceil(e.boss.hp))}</button></div>`;
  }
  body.querySelectorAll('[data-exp-page]').forEach(
    b =>
      (b.onclick = () => {
        page += Number(b.dataset.expPage);
        turn = Number(b.dataset.expPage) > 0 ? 'next' : 'prev';
        ctx.refresh();
      })
  );
  body.querySelectorAll('[data-pick]').forEach(
    b =>
      (b.onclick = () => {
        pick = b.dataset.pick;
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
  if (document.getElementById('pact-cross')) document.getElementById('pact-cross').onclick = () => ctx.cross();
  if (document.getElementById('upgrade-boat'))
    document.getElementById('upgrade-boat').onclick = () => run(upgradeBoat(s));
  body.querySelectorAll('[data-route]').forEach(b => (b.onclick = () => ctx.route(b.dataset.route)));
}
