// @todo clear all mentions of twig
import {
  CompletionItemKind,
  TextDocument,
  Position,
  workspace,
  SnippetString,
  CompletionItemProvider,
  Uri,
  languages,
  TextEdit,
  Range,
  window,
  commands,
} from 'vscode';
import { Class as ASTClass, Method, Namespace } from 'php-parser';
import phpParser from '../utils/php-parser';
import docParser from '../utils/doc-parser';
import { parse } from 'yaml';
import DrupalWorkspaceProvider from '../base/drupal-workspace-provider';
import getName from '../utils/get-name';
import { CompletionItemWithCallback } from '../types';

let cursorPosition = new Position(0, 0);

const astFileCache = new Map<string, ASTClass>();

const autocompleteList: CompletionItemWithCallback[] = [
  {
    label: 'name',
    insertText: 'name: ',
    type: 'string',
    documentation: 'Recipe name',
    callback: ``,
  },
  {
    label: 'description',
    insertText: 'description: ',
    type: 'string',
    documentation: 'Recipe description',
    callback: ``,
  },
  {
    label: 'type',
    insertText: 'type: ',
    type: 'array',
    documentation: 'Recipe type',
    callback: `getRecipeTypes`,
  },
  {
    label: 'recipes',
    insertText: 'recipes: ',
    type: 'array',
    documentation: 'Pick existing recipes',
    callback: `fetchAllRecipies`,
  },
  {
    label: 'install',
    insertText: 'install: ',
    type: 'array',
    documentation: 'List of Modules/Themes to install',
    callback: `fetchModulesThemes`,
  },
  {
    label: 'config',
    insertText: `config:\n  `,
    type: 'array',
    documentation: 'List of configs',
    callback: ``,
    children: [
      {
        label: 'import',
        insertText: 'import: ',
        type: 'array',
        parent: 'config',
        documentation: 'Import config',
        callback: `fetchConfigs`,
      },
      {
        label: 'actions',
        insertText: 'actions: ',
        type: 'array',
        parent: 'config',
        documentation: 'Perform config action',
        callback: `getConfigActions`,
      },
    ]
  },
  {
    label: 'content',
    insertText: 'content: ',
    type: 'array',
    documentation: 'Pick existing content',
    callback: `fetchContent`,
  },
].map((item) =>
  Object.assign(item, {
    detail: `Property (${item.type})`,
    kind: CompletionItemKind.Field,
    insertText: new SnippetString(item.insertText),
  })
);

export default class RecipesCompletionProvider
  extends DrupalWorkspaceProvider
  implements CompletionItemProvider
{
  static language = 'yaml';

  constructor(arg: ConstructorParameters<typeof DrupalWorkspaceProvider>[0]) {
    super(arg);

    this.disposables.push(
      languages.registerCompletionItemProvider(
        {
          language: RecipesCompletionProvider.language,
          scheme: 'file',
          pattern: this.drupalWorkspace.getRelativePattern('**/recipe.yml'),
        },
        this,
        ' ', // Opens autocomplete when space is pressed.
        '/' // Open autocomplete when user presses /.
      )
    );
  }

  provideCompletionItems(document: TextDocument, position: Position) {
    if (!this.drupalWorkspace.hasFile(document.uri)) {
      return [];
    }

    // Store the current cursor position.
    cursorPosition = position;

    const linePrefix = document
      .lineAt(position)
      .text.substring(0, position.character);

      console.log(linePrefix);

      const editor = window.activeTextEditor;
      if (editor) {
          commands.executeCommand('editor.action.triggerSuggest');
      }

    if (/\|\s*/.test(linePrefix)) {
      return [];
    } else {
      return autocompleteList;
    }
  }

  async resolveCompletionItem(
    item: CompletionItemWithCallback
  ): Promise<CompletionItemWithCallback> {
    // Remove the slash used to trigger the autocomplete.
    // @todo find a better way of doing this.
    const start = new Position(cursorPosition.line, cursorPosition.character - 1);
    const end = new Position(cursorPosition.line, cursorPosition.character);
    const range = new Range(start, end);
    setTimeout(async () => {
      window.activeTextEditor?.edit(editBuilder => {
        // Check if the character is a slash before making the substitution.
        const isSlash = ('/' === window.activeTextEditor?.document
        .lineAt(start)
        .text.substring(0, 1));
        if (isSlash) editBuilder.replace(range, '');
      });
    }, 2000);

    return item;
  }

  async fetchContent(): Promise<string | undefined> {
    return 'content';
  }

  async getDocblock(uri: Uri, fnName: string): Promise<string | undefined> {
    const filePath = uri.fsPath;
    let astClass = astFileCache.get(filePath);

    if (!astClass) {
      const buffer = await workspace.fs.readFile(uri);
      const tree = phpParser.parseCode(buffer.toString(), filePath);

      astClass = (tree.children[0] as Namespace).children.pop() as ASTClass;
      astFileCache.set(filePath, astClass);
    }

    for (const item of astClass.body) {
      switch (item.kind) {
        case 'method': {
          const func: Method = item as Method;
          const name = getName(func.name);

          if (name !== fnName) {
            break;
          }

          const lastComment = item.leadingComments?.pop();

          if (lastComment) {
            const ast = docParser.parse(lastComment.value);

            return ast.summary;
          }

          return;
        }
      }
    }
  }
}
