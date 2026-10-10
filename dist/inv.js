// Grid inventories in the spirit of Minecraft: fixed slots with an icon and a count, never a scrolling list.
// When a container holds more than one page of slots, ‹ › turn the page (with a short page-turn animation).
// Used by the bag, the desk's storage box, the warship's holds and the beast lounge.
const pageOf = new Map(),
  turnOf = new Map();
const esc = s =>
  String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// items: [{ key, icon, count, name, note?, disabled?, active? }]
export function invGrid(id, items, { cols = 9, rows = 2, fill = true } = {}) {
  const per = cols * rows,
    pages = Math.max(1, Math.ceil(items.length / per)),
    page = Math.min(pages - 1, Math.max(0, pageOf.get(id) || 0));
  pageOf.set(id, page);
  const shown = items.slice(page * per, page * per + per),
    slots = shown.map(
      it =>
        `<button type="button" class="inv-slot${it.active ? ' active' : ''}${it.count === 0 ? ' zero' : ''}" data-grid="${id}" data-slot="${esc(it.key)}" title="${esc(it.name + (it.note ? ' · ' + it.note : ''))}" aria-label="${esc(it.name)} ${it.count ?? ''}" ${it.disabled ? 'disabled' : ''}>${it.icon}${it.count !== undefined && it.count !== null ? `<b>${it.count}</b>` : ''}</button>`
    );
  if (fill) while (slots.length < per) slots.push('<span class="inv-slot empty" aria-hidden="true"></span>');
  const turn = turnOf.get(id) || '';
  turnOf.delete(id);
  return (
    `<div class="inv-grid${turn ? ' turn-' + turn : ''}" style="--cols:${cols}">${slots.join('')}</div>` +
    (pages > 1
      ? `<div class="inv-pager"><button type="button" data-turn="${id}" data-dir="-1" ${page ? '' : 'disabled'} aria-label="上一頁">‹</button><span>${page + 1} / ${pages}</span><button type="button" data-turn="${id}" data-dir="1" ${page < pages - 1 ? '' : 'disabled'} aria-label="下一頁">›</button></div>`
      : '')
  );
}
// A titled container: a header line (name + fill) above its grid.
export function invBox(id, title, meta, items, opts) {
  return `<section class="inv-box"><header><b>${esc(title)}</b>${meta ? `<span>${esc(meta)}</span>` : ''}</header>${invGrid(id, items, opts)}</section>`;
}
// How much one click moves between two containers.
export const AMOUNTS = [
  [1, '1'],
  [10, '10'],
  [Infinity, '全部']
];
let amount = Infinity;
export const moveAmount = () => amount;
export function amountBar() {
  return `<div class="inv-amount" role="group" aria-label="每次移動數量"><span>每次移動</span>${AMOUNTS.map(
    ([n, label]) => `<button type="button" data-amount="${n}" class="${n === amount ? 'active' : ''}">${label}</button>`
  ).join('')}</div>`;
}
// Wire slot clicks, page turns and the amount selector. onSlot(gridId, key, event); refresh() re-renders.
export function bindInv(root, { onSlot, refresh }) {
  root
    .querySelectorAll('.inv-slot[data-slot]')
    .forEach(b => (b.onclick = e => onSlot(b.dataset.grid, b.dataset.slot, e)));
  root.querySelectorAll('[data-turn]').forEach(
    b =>
      (b.onclick = () => {
        const id = b.dataset.turn,
          dir = Number(b.dataset.dir);
        pageOf.set(id, (pageOf.get(id) || 0) + dir);
        turnOf.set(id, dir > 0 ? 'next' : 'prev');
        refresh();
      })
  );
  root.querySelectorAll('[data-amount]').forEach(
    b =>
      (b.onclick = () => {
        amount = Number(b.dataset.amount);
        refresh();
      })
  );
}
export const resetPage = id => pageOf.delete(id);
