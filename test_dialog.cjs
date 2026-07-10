const { dialog } = require('electron');
try {
  dialog.showSaveDialog(null, { title: 123 }).catch(e => console.log(e));
} catch (e) {
  console.log("Caught:", e);
}
