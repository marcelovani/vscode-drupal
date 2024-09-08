export type options = {
    label: string
    insertText: string,
    type: string,
    documentation: string,
    parent: string,
}

export const defaultAttributes: options[] = [
    {
        label: 'name',
        insertText: 'name: "',
        type: 'string',
        documentation: 'Recipe name',
        parent: '',
    },
    {
        label: 'description',
        insertText: 'description: "',
        type: 'string',
        documentation: 'Recipe description',
        parent: '',
    },
    // List https://git.drupalcode.org/project/distributions_recipes/-/blob/1.0.x/docs/recipe_types.md
    {
        label: 'type',
        insertText: 'type: (',
        type: 'array',
        documentation: 'Recipe type',
        parent: '',
    },
    {
        label: 'Site',
        insertText: 'Site',
        type: 'string',
        documentation: 'Site',
        parent: 'type',
    },
    {
        label: 'Administration',
        insertText: 'Administration',
        type: 'string',
        documentation: 'Administration',
        parent: 'type',
    },
    {
        label: 'Administration',
        insertText: 'Administration',
        type: 'string',
        documentation: 'Administration',
        parent: 'type',
    },
    {
        label: 'Performance',
        insertText: 'Performance',
        type: 'string',
        documentation: 'Performance',
        parent: 'type',
    },
    {
        label: 'recipes',
        insertText: 'recipes:\n  ',
        type: 'array',
        documentation: 'Pick existing recipes',
        parent: '',
    },
    {
        label: 'install',
        insertText: 'install:\n  ',
        type: 'array',
        documentation: 'List of Modules/Themes to install',
        parent: '',
    },
    {
        label: 'config',
        insertText: 'config:\n  ',
        type: 'array',
        documentation: 'List of configs',
        parent: '',
    },
    {
        label: 'import',
        insertText: 'import:\n  ',
        type: 'array',
        documentation: 'Import config',
        parent: 'config',
    },
    {
        label: 'actions',
        insertText: 'actions:\n  ',
        type: 'array',
        documentation: 'Perform config action',
        parent: 'config',
    },
    // List https://git.drupalcode.org/project/distributions_recipes/-/blob/1.0.x/docs/config_action_list.md
    {
        label: 'create',
        insertText: 'create:\n  ',
        type: 'array',
        documentation: 'Create',
        parent: 'actions',
    },
    {
        label: 'createIfNotExists',
        insertText: 'createIfNotExists:\n  ',
        type: 'array',
        documentation: 'Create if doesn\'t exist',
        parent: 'actions',
    },
    {
        label: 'disable',
        insertText: 'disable:\n  ',
        type: 'array',
        documentation: 'Disable config',
        parent: 'actions',
    },
    {
        label: 'enable',
        insertText: 'enable:\n  ',
        type: 'array',
        documentation: 'Enable config',
        parent: 'actions',
    },
    {
        label: 'simpleConfigUpdate',
        insertText: 'simpleConfigUpdate:\n  ',
        type: 'array',
        documentation: 'Config update',
        parent: 'actions',
    },
    {
        label: 'content',
        insertText: 'content:\n  ',
        type: 'array',
        documentation: 'Pick existing content',
        parent: '',
    }
];
