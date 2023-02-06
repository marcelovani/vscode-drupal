import { ExtensionContext, RelativePattern, workspace } from 'vscode';
import ShowOutputChannel from './commands/show-output-channel';
import DrupalStatusBar from './base/drupal-status-bar';
import DrupalWorkspace from './base/drupal-workspace';
import getWorkspaceFolders from './utils/get-workspace-folders';

export async function activate(context: ExtensionContext) {
  const drupalWorkspaces = [];

  for (const workspaceFolder of getWorkspaceFolders()) {
    const include = new RelativePattern(workspaceFolder, 'composer.json');
    const composerUri = await workspace.findFiles(include, undefined, 1);

    if (composerUri.length === 0) {
      continue;
    }

    const composer = await workspace.fs
      .readFile(composerUri[0])
      .then((value) => value.toString())
      .then((value) => JSON.parse(value));

    if ('drupal/core-recommended' in composer.require) {
      drupalWorkspaces.push(new DrupalWorkspace(context, workspaceFolder));
    }
  }

  if (drupalWorkspaces.length === 0) {
    return;
  }

  context.subscriptions.push(
    ...drupalWorkspaces,

    // Common
    new DrupalStatusBar(context),

    // Commands
    new ShowOutputChannel()
  );
}

export function deactivate() {}
