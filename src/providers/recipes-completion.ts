import {
  CompletionItem,
  CompletionItemKind,
  CompletionItemProvider,
  TextDocument,
  Position,
  workspace,
  SnippetString,
  Uri,
  languages,
  window,
  commands,
} from 'vscode';
import { options, defaultAttributes } from './recipes';
import { Class as ASTClass, Method, Namespace } from 'php-parser';
import phpParser from '../utils/php-parser';
import docParser from '../utils/doc-parser';
import { parse as parseYaml, stringify } from 'yaml';
import DrupalWorkspaceProvider from '../base/drupal-workspace-provider';
import getName from '../utils/get-name';
import { CompletionItemWithCallback } from '../types';

const astFileCache = new Map<string, ASTClass>();

// Stores the full list of attributes.
let autocompleteList:options[] = [];

// Stores current celection of attributes.
let currentList = autocompleteList;

export default class RecipesCompletionProvider
  extends DrupalWorkspaceProvider
  implements CompletionItemProvider
{
  static language = 'yaml';

  completions: CompletionItem[] = [];
  completionFileCache: Map<string, CompletionItem[]> = new Map();

  constructor(arg: ConstructorParameters<typeof DrupalWorkspaceProvider>[0]) {
    super(arg);
    autocompleteList = defaultAttributes;

    this.disposables.push(
      languages.registerCompletionItemProvider(
        {
          language: RecipesCompletionProvider.language,
          scheme: 'file',
          pattern: this.drupalWorkspace.getRelativePattern('**/recipe.yml'),
        },
        this
      )
    );

    this.parseYamlFiles();
  }

  async parseYamlFiles() {
    const completions: CompletionItem[] = [];
    const files =  await this.drupalWorkspace.findFiles('**/*.yml', '{vendor,node_modules}');

    let type = '';
    let label = '';
    let detail = '';

    for (const path of files) {
      if (this.completionFileCache.get(path.fsPath)) {
        continue;
      }

      // @todo add these items to array and loop
      if (path.toString().includes('.libraries.yml')) {
        // Exclude libraries.
        continue;
      }
      else if (path.toString().includes('.services.yml')) {
        // Exclude services.
        continue;
      }
      else if (path.toString().includes('.field_type_categories.yml')) {
        // Exclude field_type_categories.
        continue;
      }
      else if (path.toString().includes('.link_relation_types.yml')) {
        // Exclude link_relation_types.
        continue;
      }
      else if (path.toString().includes('/recipe.yml')) {
        type = 'recipe';
        label = 'Recipe';
      }
      else if (path.toString().includes('/config/')) {
        // Exclude config schema.
        if (path.toString().includes('/schema/')) {
          continue;
        }
        type = 'config';
        label = 'Config';
      }
      else if (path.toString().includes('/profiles/')) {
        type = 'profile';
        label = 'Profile';
      }
      else if (path.toString().includes('/modules/')) {
        type = 'module';
        label = 'Module';
      }
      else if (path.toString().includes('/themes/')) {
        type = 'theme';
        label = 'Theme';
      }
      else if (path.toString().includes('/default_content/') || path.toString().includes('/content/')) {
        type = 'content';
        label = 'Content';
      }
      else {
        console.log('Excluded', path);
        continue;
      }

      // Read file.
      const buffer = await workspace.fs.readFile(path);
      const contents = parseYaml(buffer.toString());

      if (contents == null) {
        console.error("Cannot parse", path);
        continue;
      }

      if (type == 'module' || type == 'theme') {
        if (typeof contents.hidden !== 'undefined' && contents.hidden == 'true') {
          // Exclude hidden modules.
          continue;
        }
      }

      let regex = null;
      let match = null;
      let insertText = '';
      let parent = '';
      switch(type) {
        case 'theme':
        case 'module':
        case 'profile':
          regex = new RegExp(`/${type}s/.*\/(.*?)\\.info`);
          match = path.toString().match(regex);
          if (match) {
            insertText = match[1];
          }
          else {
            continue;
          }
          label = `${contents.name} (${label})`;
          parent = 'install';
          break;

        case 'recipe':
          regex = /\/([^\/]+)\/recipe\.yml$/;
          match = path.toString().match(regex);
          if (match) {
            insertText = match[1];
          }
          else {
            continue;
          }
          label = `${contents.name} (${label})`;
          parent = 'recipes';
          break;
    
        case 'config':
          regex = /\/config\/.*\/([^\/]+)\.yml$/;
          match = path.toString().match(regex);
          if (match) {
            insertText = match[1];
          }
          else {
            continue;
          }
          label = `${contents.id} (${label})`;
          parent = 'import';
          break;

        case 'content':
          console.error(`Type not implemented ${type}`);

        default:
          console.error(`Type not treated ${type}`);
      }

      const completion: CompletionItem = {
        label,
        detail: parent,
        insertText: new SnippetString(
          `- ${insertText}\n`
        ),
      };

      completions.push(completion);

      this.completionFileCache.set(path.fsPath, completions);
    }

    // @todo Investigate why there are multiple duplications.
    this.completions = ([] as CompletionItem[]).concat(
      ...this.completionFileCache.values()
    );
  }

  getParentAttribute(position: Position):string {
      // @todo find parent based on indentation
      if (position.character == 0) {
        return '';
      }

      let line = position.line;
      let match = null;
      do {
        let attribute = window.activeTextEditor?.document
          .lineAt(line)
          .text.substring(0, 1000).trim();

        // Use regex to match text before colon.
        // @todo trim spaces on the left using regex.
        match = attribute?.toString().match(/(\w+):/);

        // Keep going up until we find the parent attribute.
        line--;          
      } while (!match || line == 0);

      return match ? match[1] : '';
  }

  async provideCompletionItems(document: TextDocument, position: Position) {
    if (!this.drupalWorkspace.hasFile(document.uri)) {
      return [];
    }

    const linePrefix = document
      .lineAt(position)
      .text.substring(0, position.character);

    let parentAttribute = this.getParentAttribute(position);

    // Get completions for the parent item.
    let filtered = this.completions.filter((item) =>
      parentAttribute !== '' && item.detail == parentAttribute
    );

    // Workaround to deal with duplicated entries.
    // @todo fix the caching and remove this.
    filtered = filtered.filter((item, index, self) => {
      let firstOccurrenceIndex = self.findIndex(t => t.label === item.label);
      return index === firstOccurrenceIndex;
    });

    // When there is no completion for this context, show default items.
    if (filtered.length == 0) {
      filtered = defaultAttributes.map((item) =>
        Object.assign(JSON.parse(JSON.stringify(item)), {
          detail: `Attribute (${item.type})`,
          kind: CompletionItemKind.Field,
          insertText: new SnippetString(item.type == 'array' ? `${item.insertText}` : item.insertText),
        })
      ).filter((item) =>
        // Show top level attributes or attributes for parent.
        (position.character == 0 && item.parent == '') || item.parent == parentAttribute
      );
    }

    return filtered.map((item) => {
      const newItem = Object.assign({}, item);

      if (newItem.insertText instanceof SnippetString) {
        newItem.insertText = new SnippetString(
          newItem.insertText.value
        );
      }
      return newItem;
    });
  }
}
