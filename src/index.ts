// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import '../style/index.css';

import {
  Widget
} from '@phosphor/widgets';

import {
  ILayoutRestorer, JupyterLab, JupyterLabPlugin
} from '@jupyterlab/application';

import {
  showDialog, Dialog, ICommandPalette
} from '@jupyterlab/apputils';

import {
  ISettingRegistry, PathExt
} from '@jupyterlab/coreutils';

import {
  IEditorServices
} from '@jupyterlab/codeeditor';

import {
  IDocumentManager
} from '@jupyterlab/docmanager';

import {
  IFileBrowserFactory
} from '@jupyterlab/filebrowser';

import {
  ChatboxPanel
} from './chatbox';

import {
  GoogleDriveFileBrowser, NAMESPACE
} from './drive/browser';

import {
  getResourceForPath, createPermissions
} from './drive/drive';

import {
  GoogleDrive
} from './drive/contents';

import {
  loadGapi
} from './gapi';

/**
 * The command IDs used by the chatbox plugin.
 */
namespace CommandIDs {
  export
  const clear = 'chatbox:clear';

  export
  const run = 'chatbox:post';

  export
  const linebreak = 'chatbox:linebreak';
};

/**
 * The JupyterLab plugin for the Google Drive Filebrowser.
 */
const fileBrowserPlugin: JupyterLabPlugin<void> = {
  id: 'jupyter.extensions.google-drive',
  requires: [ICommandPalette, IDocumentManager, IFileBrowserFactory, ILayoutRestorer, ISettingRegistry],
  activate: activateFileBrowser,
  autoStart: true
};

/**
 * Activate the file browser.
 */
function activateFileBrowser(app: JupyterLab, palette: ICommandPalette, manager: IDocumentManager, factory: IFileBrowserFactory, restorer: ILayoutRestorer, settingRegistry: ISettingRegistry): void {
  let { commands } = app;
  const id = fileBrowserPlugin.id;

  // Load the gapi libraries onto the page.
  loadGapi();

  // Add the Google Drive backend to the contents manager.
  let drive = new GoogleDrive(app.docRegistry);
  manager.services.contents.addDrive(drive);

  // Construct a function that determines whether any documents
  // associated with this filebrowser are currently open.
  let hasOpenDocuments = () => {
    let iterator = app.shell.widgets('main');
    let widget: Widget | undefined;
    while (widget = iterator.next()) {
      let context = manager.contextForWidget(widget);
      if (context && context.path.split(':')[0] === drive.name) {
        return true;
      }
    }
    return false;
  }

  // Create the file browser.
  let browser = new GoogleDriveFileBrowser(
    drive.name, app.docRegistry, commands, manager, factory,
    settingRegistry.load(id), hasOpenDocuments);

  // Add the file browser widget to the application restorer.
  restorer.add(browser, NAMESPACE);
  app.shell.addToLeftArea(browser, { rank: 101 });

  // Add the share command to the command registry.
  let command = `google-drive:share`;
  commands.addCommand(command, {
    execute: ()=> {
      const widget = app.shell.currentWidget;
      const context = widget ? manager.contextForWidget(widget) : undefined;
      if (context) {
        let path = context.path;
        // Do nothing if this file is not in the user's Google Drive.
        if (path.split(':')[0] !== drive.name) {
          console.warn('Cannot share a file outside of Google Drive');
          return;
        }
        // Otherwise open the sharing dialog.
        showDialog({
          title: `Share "${PathExt.basename(path)}"`,
          body: new Private.EmailAddressWidget(),
          focusNodeSelector: 'input',
          buttons: [Dialog.cancelButton(), Dialog.okButton({label: 'ADD'})]
        }).then( result => {
          if (result.button.accept) {
            // Get the file resource for the path and create
            // permissions for the valid email addresses.
            let addresses: string[] = result.value;
            let localPath = path.split(':').pop();
            getResourceForPath(localPath!).then((resource) => {
              createPermissions(resource, addresses);
            });
          }
        });
      }
    },
    icon: 'jp-MaterialIcon jp-ShareIcon',
    label: 'Share'
  });
  palette.addItem({ command, category: 'File Operations' });

  return;
}

/**
 * The chatbox widget content factory.
 */
export
const chatboxPlugin: JupyterLabPlugin<void> = {
  id: 'jupyter.extensions.chatbox',
  requires: [ICommandPalette, IEditorServices, IDocumentManager, ILayoutRestorer],
  autoStart: true,
  activate: activateChatbox
};

/**
 * Activate the chatbox extension.
 */
function activateChatbox(app: JupyterLab, palette: ICommandPalette, editorServices: IEditorServices, docManager: IDocumentManager, restorer: ILayoutRestorer): void {
  const id = 'chatbox';
  let { commands, shell } = app;
  let category = 'Chatbox';
  let command: string;

  /**
   * Create a chatbox for a given path.
   */
  let editorFactory = editorServices.factoryService.newInlineEditor.bind(
    editorServices.factoryService);
  let contentFactory = new ChatboxPanel.ContentFactory({ editorFactory });
  let panel = new ChatboxPanel({
    rendermime: app.rendermime.clone(),
    contentFactory
  });

  // Add the chatbox panel to the tracker.
  panel.title.label = 'Chat';
  panel.id = id;

  restorer.add(panel, 'chatbox');

  command = CommandIDs.clear;
  commands.addCommand(command, {
    label: 'Clear Chat',
    execute: args => {
      panel.chatbox.clear();
    }
  });
  palette.addItem({ command, category });

  command = CommandIDs.run;
  commands.addCommand(command, {
    label: 'Post Chat Entry',
    execute: args => {
      panel.chatbox.post();
    }
  });
  palette.addItem({ command, category });

  command = CommandIDs.linebreak;
  commands.addCommand(command, {
    label: 'Insert Line Break',
    execute: args => {
      panel.chatbox.insertLinebreak();
    }
  });
  palette.addItem({ command, category });

  // Add keybindings to the chatbox
  commands.addKeyBinding({
    command: 'chatbox:post',
    selector: '.jp-Chatbox-prompt',
     keys: ['Enter']
  });
  commands.addKeyBinding({
    command: 'chatbox:linebreak',
    selector: '.jp-Chatbox-prompt',
    keys: ['Ctrl Enter']
  });

  let updateDocumentContext = function (): void {
    let widget = shell.currentWidget;
    let context = widget ? docManager.contextForWidget(widget) : undefined;
    if (context && context.model.modelDB.isCollaborative) {
      if (!panel.isAttached) {
        shell.addToLeftArea(panel);
      }
      panel.context = context;
    }
  };

  app.restored.then(() => {
    updateDocumentContext();
  });
  shell.currentChanged.connect(updateDocumentContext);
}


/**
 * Export the plugins as default.
 */
const plugins: JupyterLabPlugin<any>[] = [
  fileBrowserPlugin,
  chatboxPlugin
];
export default plugins;


/**
 * A namespace for private data.
 */
namespace Private {
  /**
   * A widget the reads and parses email addresses.
   */
  export
  class EmailAddressWidget extends Widget {
    /**
     * Construct a new EmailAddressWidget.
     */
    constructor() {
      super();
      let text = document.createElement('p');
      text.textContent = 'Enter collaborator Gmail address. '+
                         'Multiple addresses may be separated by commas';
      this._inputNode = document.createElement('input');
      this.node.appendChild(text);
      this.node.appendChild(this._inputNode);
      // Set 'multiple' and 'type=email' attributes,
      // which strips leading and trailing whitespace from
      // the email adresses.
      this._inputNode.setAttribute('type', 'email');
      this._inputNode.setAttribute('multiple', '');
    }

    /**
     * Get the value for the widget.
     */
    getValue(): string[] {
      // Pick out the valid email addresses
      let candidateAddresses = this._inputNode.value.split(',');
      let addresses: string[] = [];
      for (let address of candidateAddresses) {
        if (isEmail(address)) {
         addresses.push(address);
        } else {
          console.warn(`"${address}" is not a valid email address`);
        }
      }
      return addresses;
    }

    private _inputNode: HTMLInputElement;
  }

  /**
   * Return whether an email address is valid.
   * Uses a regexp given in the html spec here:
   * https://html.spec.whatwg.org/multipage/input.html#e-mail-state-(type=email)
   * 
   * #### Notes: this is not a perfect test, but it should be
   *   good enough for most use cases.
   *
   * @param email: the canditate email address.
   *
   * @returns a boolean for whether it is a valid email.
   */
  function isEmail(email: string): boolean {
    let re = RegExp(/^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/);
    return re.test(email);
  }
}
