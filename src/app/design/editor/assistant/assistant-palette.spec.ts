import { flattenAssistantPalette, groupAssistantPalette } from './assistant-palette';

describe('groupAssistantPalette', () => {
  it('groups form palette entries into semantic categories', () => {
    const groups = groupAssistantPalette([
      { label: 'Simple Text', item: { type: 'text' } },
      { label: 'Number Input', item: { type: 'number' } },
      { label: 'Image File', item: { type: 'file' } },
      { label: 'Dropdown (Single)', item: { type: 'select' } },
      { label: 'Speech To Text', item: { type: 'speech' } },
      { label: 'Dataset', item: { type: 'dataset' } },
    ], '', true);

    expect(groups.map((group) => group.label)).toEqual([
      'Common',
      'File Uploads',
      'Choices',
      'Special',
      'Embeddable',
    ]);
    expect(groups[0].items.map((item) => item.label)).toEqual(['Simple Text', 'Number Input']);
  });

  it('flattens groups in the same order rendered by the palette', () => {
    const groups = groupAssistantPalette([
      { label: 'Dataset', item: { type: 'dataset' } },
      { label: 'Simple Text', item: { type: 'text' } },
      { label: 'Dropdown', item: { type: 'select' } },
    ], '', true);

    expect(flattenAssistantPalette(groups).map((item) => item.label)).toEqual([
      'Dataset',
      'Simple Text',
      'Dropdown',
    ]);
  });
});
