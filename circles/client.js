const byId = (id) => document.getElementById(id);
const formValues = (form) => Object.fromEntries(new FormData(form));
const monthNow = () => new Date().toISOString().slice(0, 7);
let user;
let selected;
let month = monthNow();

async function api(path, options = {}) {
  const response = await fetch('/api' + path, options);
  const value = await response.json();
  if (!response.ok) throw Object.assign(new Error(value.error), { status: response.status });
  return value;
}

function post(path, value = {}) {
  return api(path, {
    method: 'POST',
    headers: { 'X-MemoryCircle': '1', 'Content-Type': 'application/json' },
    body: JSON.stringify(value),
  });
}

async function perform(action, control) {
  byId('error').textContent = '';
  byId('notice').textContent = '';
  if (control) control.disabled = true;
  try {
    await action();
  } catch (error) {
    byId('error').textContent = error.message;
    if (error.status === 401 && user) await refresh();
  } finally {
    if (control) control.disabled = false;
  }
}

function submit(id, action) {
  byId(id).addEventListener('submit', (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const values = formValues(form);
    void perform(() => action(values, form, event.submitter), event.submitter);
  });
}

function button(text, action) {
  const control = document.createElement('button');
  control.textContent = text;
  control.addEventListener('click', () => void perform(action, control));
  return control;
}

function listItem(text, actionButton) {
  const item = document.createElement('li');
  item.textContent = text;
  if (actionButton) item.append(' ', actionButton);
  return item;
}

async function refresh() {
  let state;
  try {
    state = await api('/circles');
  } catch (error) {
    if (error.status !== 401) throw error;
    user = undefined;
    selected = undefined;
  }
  byId('auth').hidden = Boolean(state);
  byId('workspace').hidden = !state;
  if (!state) return;

  user = state.user;
  byId('identity').textContent = 'Signed in as ' + user.username;
  byId('circle-list').replaceChildren(...state.circles.map((circle) => button(circle.name, async () => {
    if (selected !== circle.id) {
      month = monthNow();
      byId('invite-box').hidden = true;
      byId('invite-link').value = '';
    }
    selected = circle.id;
    await showCircle();
  })));
  if (state.circles.length === 0) byId('circle-list').textContent = 'You have no circles yet.';
  if (!state.circles.some((circle) => circle.id === selected)) selected = undefined;
  await showCircle();
}

async function showCircle() {
  byId('detail').hidden = true;
  if (!selected) return;
  const path = '/circles/' + selected;
  const state = await api(path + '?month=' + encodeURIComponent(month));
  if (path !== '/circles/' + selected) return;
  const isOwner = state.circle.owner === user.id;
  byId('circle-title').textContent = state.circle.name;
  byId('schedule-summary').textContent =
    'Posting schedule: ' + state.circle.schedule + ' · ' +
    (state.contributed ? 'You contributed this period.' : 'You have not contributed this period.');
  byId('schedule-form').elements.schedule.value = state.circle.schedule;
  byId('month-form').elements.month.value = state.month;
  byId('owner-tools').hidden = !isOwner;
  byId('leave').hidden = isOwner;
  byId('members').replaceChildren(...state.members.map((member) => {
    const owner = member.id === state.circle.owner;
    const remove = isOwner && !owner ? button('Remove ' + member.username, async () => {
      if (!confirm('Remove ' + member.username + ' and delete their photos from this circle?')) return;
      await post(path + '/remove/' + member.id);
      await refresh();
    }) : null;
    return listItem(member.username + (owner ? ' (owner)' : ''), remove);
  }));
  byId('invites').replaceChildren(...state.invites.map((invite) =>
    listItem('Expires ' + new Date(invite.expires).toLocaleString(), button('Revoke invitation', async () => {
      await post(path + '/invites/' + invite.id);
      byId('invite-box').hidden = true;
      byId('invite-link').value = '';
      await showCircle();
    }))));
  byId('photos').replaceChildren(...state.photos.map((photo) => {
    const item = document.createElement('figure');
    const image = document.createElement('img');
    image.loading = 'lazy';
    image.src = '/api' + path + '/photos/' + photo.id;
    image.alt = photo.caption || 'Photo shared by ' + photo.username;
    const caption = document.createElement('figcaption');
    caption.textContent = photo.username + ' · ' + new Date(photo.uploaded).toISOString().slice(0, 10) +
      (photo.caption ? ' · ' + photo.caption : '');
    item.append(image, caption);
    return item;
  }));
  if (!state.photos.length) byId('photos').textContent = 'No photos for this month.';
  byId('detail').hidden = false;
}

submit('credentials', async (values, form, control) => {
  await post('/' + control.value, values);
  if (control.value === 'register') {
    byId('notice').textContent = 'Account created. Select Sign in to continue.';
  } else {
    form.reset();
    await refresh();
  }
});
submit('create', async (values, form) => {
  selected = (await post('/circles', values)).id;
  month = monthNow();
  byId('invite-box').hidden = true;
  form.reset();
  await refresh();
});
submit('join', async ({ invite }, form) => {
  const value = invite.trim();
  const code = value.match(/#invite=([\w-]{43})$/)?.[1] ?? value;
  selected = (await post('/join', { invite: code })).id;
  month = monthNow();
  byId('invite-box').hidden = true;
  form.reset();
  history.replaceState(null, '', location.pathname);
  await refresh();
});
submit('month-form', async (values) => {
  month = values.month;
  await refresh();
});
submit('schedule-form', async (values) => {
  await post('/circles/' + selected + '/schedule', values);
  await showCircle();
});
submit('upload', async ({ photo, caption }, form) => {
  await api('/circles/' + selected + '/photos?caption=' + encodeURIComponent(caption), {
    method: 'POST', headers: { 'X-MemoryCircle': '1' }, body: photo,
  });
  form.reset();
  month = monthNow();
  await showCircle();
  byId('notice').textContent = 'Photo added to the timeline.';
});
byId('invite').onclick = () => void perform(async () => {
  const { invite } = await post('/circles/' + selected + '/invites');
  byId('invite-link').value = location.origin + '/#invite=' + invite;
  byId('invite-box').hidden = false;
  await showCircle();
  byId('invite-link').select();
}, byId('invite'));
byId('leave').onclick = () => void perform(async () => {
  if (!confirm('Leave this circle and delete your photos from it?')) return;
  await post('/circles/' + selected + '/leave');
  selected = undefined;
  await refresh();
}, byId('leave'));
byId('sign-out').onclick = () => void perform(async () => {
  await post('/sign-out');
  byId('invite-box').hidden = true;
  byId('invite-link').value = '';
  await refresh();
}, byId('sign-out'));

const invitation = location.hash.match(/^#invite=([\w-]{43})$/)?.[1];
if (invitation) byId('join').elements.invite.value = invitation;
void perform(refresh);
