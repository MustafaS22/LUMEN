import type { LayoutSchema } from './layout-schema'

type Example = {
  id: string
  category: string
  description: string
  layout: LayoutSchema
}

export const examples: Example[] = [
  {
    id: 'studio',
    category: 'Dashboard',
    description: 'Review a creative team’s launch metrics and next steps.',
    layout: {
      shell: 'dashboard',
      title: 'Studio launch dashboard',
      summary: 'Sample campaign data for a small creative studio.',
      blocks: [
        { type: 'stat', label: 'Landing visits', value: '24,680', delta: '+18% this month', positive: true },
        { type: 'stat', label: 'Waitlist signups', value: '1,842', delta: '+24% this month', positive: true },
        { type: 'stat', label: 'Signup conversion', value: '7.5%', delta: '+0.4 percentage points', positive: true },
        { type: 'chart', title: 'Weekly signups', kind: 'line', data: [148, 205, 271, 319, 404, 495], labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Week 6'] },
        { type: 'list', title: 'Launch checklist', items: [
          { title: 'Review landing page', meta: 'Design', done: true },
          { title: 'Test signup flow', meta: 'Product', done: false },
          { title: 'Schedule announcement', meta: 'Marketing', done: false },
        ] },
        { type: 'table', title: 'Acquisition channels', columns: ['Channel', 'Visits', 'Signups'], rows: [
          ['Organic search', '10,210', '843'],
          ['Social', '8,940', '586'],
          ['Referrals', '5,530', '413'],
        ] },
      ],
    },
  },
  {
    id: 'timer',
    category: 'Code studio',
    description: 'Edit, run, and download a working browser timer.',
    layout: {
      shell: 'ide',
      title: 'Focus timer',
      summary: 'An editable, single-file timer with a sandboxed preview.',
      blocks: [{ type: 'code', title: 'Focus timer', spec: 'Build a 25-minute focus timer with start, pause, and reset.' }],
    },
  },
  {
    id: 'field',
    category: 'Documents',
    description: 'Browse and export a short guide to better field notes.',
    layout: {
      shell: 'publisher',
      title: 'A field guide to observation',
      summary: 'A practical guide for turning everyday details into usable notes.',
      blocks: [
        { type: 'text', title: 'Start with a place', body: 'Choose a location you can return to easily. Spend ten minutes looking at the same small area. Record when you arrive, the weather, and one detail that surprised you.' },
        { type: 'text', title: 'Describe what you saw', body: 'Write down sensory details before interpreting them. “Three birds left the branch when the door closed” gives your future self more to work with than “the birds were nervous.”' },
        { type: 'text', title: 'Return with a question', body: 'Reread your first entry before going back. Look for something that changed and something that stayed the same. Add a question you can investigate on your next visit.' },
      ],
    },
  },
]

export const focusTimerCode = `<!DOCTYPE html>
<html lang="en">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Focus timer</title>
<style>
  * { box-sizing: border-box; }
  body { margin: 0; min-height: 100vh; display: grid; place-items: center;
    padding: 18px; background: #141d25; color: #f4f7f7; font: 16px system-ui; }
  main { text-align: center; }
  h1 { font-size: 1.15rem; margin: 0; }
  output { display: block; padding: .2em 0; font: 400 clamp(3rem, 16vw, 7rem) Georgia; }
  button { background: #bcece6; color: #16272a; border: 0; border-radius: 8px;
    padding: .7rem 1rem; font: inherit; cursor: pointer; }
  #reset { background: transparent; color: #d1e2e4; }
</style>
<main>
  <h1>Focus timer</h1>
  <output id="clock" aria-label="Time remaining" aria-live="off">25:00</output>
  <button id="toggle">Start</button>
  <button id="reset">Reset</button>
</main>
<script>
  const clock = document.querySelector('#clock');
  const toggle = document.querySelector('#toggle');
  let remaining = 25 * 60;
  let deadline = 0;
  let interval;

  function render() {
    const minutes = String(Math.floor(remaining / 60)).padStart(2, '0');
    const seconds = String(remaining % 60).padStart(2, '0');
    clock.textContent = minutes + ':' + seconds;
  }
  function pause() {
    clearInterval(interval);
    interval = undefined;
    toggle.textContent = 'Start';
  }
  function tick() {
    remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
    render();
    if (remaining === 0) pause();
  }
  toggle.onclick = () => {
    if (interval) { tick(); pause(); return; }
    if (remaining === 0) remaining = 25 * 60;
    deadline = Date.now() + remaining * 1000;
    interval = setInterval(tick, 200);
    toggle.textContent = 'Pause';
    render();
  };
  document.querySelector('#reset').onclick = () => {
    pause();
    remaining = 25 * 60;
    render();
  };
</script>
</html>`
