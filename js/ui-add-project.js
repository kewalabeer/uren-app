import { db } from './db.js';

const NEW_CLIENT_VALUE = '__new__';

let dialogEl;
let onChangeCb;

async function populateClients(selectEl, preselectedClientId) {
  selectEl.replaceChildren();
  const clients = await db.listClients();
  for (const client of clients) {
    const opt = document.createElement('option');
    opt.value = client.id;
    opt.textContent = client.name;
    selectEl.append(opt);
  }
  const newOpt = document.createElement('option');
  newOpt.value = NEW_CLIENT_VALUE;
  newOpt.textContent = '+ Nieuwe opdrachtgever…';
  selectEl.append(newOpt);

  if (preselectedClientId && clients.some((c) => c.id === preselectedClientId)) {
    selectEl.value = preselectedClientId;
  } else if (clients.length === 0) {
    selectEl.value = NEW_CLIENT_VALUE;
  }
}

export function initAddProjectSheet(dialog, { onChange } = {}) {
  dialogEl = dialog;
  onChangeCb = onChange;

  const form = dialog.querySelector('#add-project-form');
  const clientSelect = dialog.querySelector('#ap-client-select');
  const newClientField = dialog.querySelector('#ap-new-client-field');
  const newClientInput = dialog.querySelector('#ap-new-client-name');
  const projectNameInput = dialog.querySelector('#ap-project-name');
  const fixedHoursInput = dialog.querySelector('#ap-fixed-hours');
  const closeBtn = dialog.querySelector('[data-close]');

  const syncNewClientVisibility = () => {
    newClientField.hidden = clientSelect.value !== NEW_CLIENT_VALUE;
  };
  clientSelect.addEventListener('change', syncNewClientVisibility);

  closeBtn.addEventListener('click', () => dialog.close());

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    let clientId = clientSelect.value;
    if (clientId === NEW_CLIENT_VALUE) {
      const name = newClientInput.value.trim();
      if (!name) {
        newClientInput.focus();
        return;
      }
      const existing = await db.findClientByName(name);
      const client = existing || (await db.addClient({ name }));
      clientId = client.id;
    }

    const projectName = projectNameInput.value.trim();
    if (!projectName) {
      projectNameInput.focus();
      return;
    }

    const fixedHoursRaw = fixedHoursInput.value.trim();
    const fixedHours = fixedHoursRaw === '' ? null : Number(fixedHoursRaw);

    await db.addProject({ clientId, name: projectName, fixedHours });

    form.reset();
    newClientField.hidden = true;
    dialog.close();
    onChangeCb && onChangeCb();
  });

  dialog.addEventListener('cancel', () => form.reset());
}

export async function openAddProjectSheet(preselectedClientId) {
  const clientSelect = dialogEl.querySelector('#ap-client-select');
  await populateClients(clientSelect, preselectedClientId);
  dialogEl.querySelector('#ap-new-client-field').hidden = clientSelect.value !== NEW_CLIENT_VALUE;
  dialogEl.showModal();
}
