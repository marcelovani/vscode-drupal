import {
  CompletionItem,
  CompletionItemKind,
  CompletionItemProvider,
  languages,
  Position,
  TextDocument,
  Uri,
  workspace,
} from 'vscode';
import { basename } from 'path';
import DrupalWorkspaceProvider from '../base/drupal-workspace-provider';
import { parse } from 'yaml';

const prefixes = [
  'Drupal::service(',
  '$container->get(',
  '$container->getDefinition(',
];

export default class ServicesCompletionProvider
  extends DrupalWorkspaceProvider
  implements CompletionItemProvider
{
  static language = 'php';

  completions: CompletionItem[] = [];
  completionFileCache: Map<string, CompletionItem[]> = new Map();

  constructor(arg: ConstructorParameters<typeof DrupalWorkspaceProvider>[0]) {
    super(arg);

    this.watcher.onDidChange(this.parseFiles, this, this.disposables);

    this.disposables.push(
      languages.registerCompletionItemProvider(
        ServicesCompletionProvider.language,
        this,
        '"',
        "'"
      )
    );

    this.parseFiles();
  }

  async parseFiles(uri?: Uri) {
    const uris = uri
      ? [uri]
      : await this.drupalWorkspace.findFiles(this.pattern);

    for (const uri of uris) {
      const completions: CompletionItem[] = [];
      const buffer = await workspace.fs.readFile(uri);
      const moduleName = basename(uri.path, '.services.yml');
      const yaml = parse(buffer.toString());

      if ('services' in yaml) {
        for (const name in yaml.services) {
          const completion: CompletionItem = {
            label: `${moduleName}.${name}`,
            kind: CompletionItemKind.Class,
            detail: `Service`,
          };

          completions.push(completion);
        }

        this.completionFileCache.set(uri.fsPath, completions);
      }
    }

    this.completions = ([] as CompletionItem[]).concat(
      ...this.completionFileCache.values()
    );
  }

  async provideCompletionItems(document: TextDocument, position: Position) {
    if (!this.drupalWorkspace.hasFile(document.uri)) {
      return [];
    }

    const linePrefix = document
      .lineAt(position)
      .text.substring(0, position.character);

    if (!prefixes.some((item) => linePrefix.includes(item))) {
      return [];
    }

    return this.completions;
  }
}
