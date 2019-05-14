import { Path } from '../../../../src/utility/path';
import { BotProject } from '../../../../src/models/bot/botProject';
import { LocationRef } from '../../../../src/models/bot/interface';

jest.mock('azure-storage', () => {
  return {};
});

const mockLocationRef: LocationRef = {
  storageId: 'default',
  path: Path.join(__dirname, '../../mocks/1.botproj'),
};

const proj = new BotProject(mockLocationRef);

describe('Index lg files', () => {
  it('should index the lg file.', async () => {
    const initFiles = [
      {
        name: 'test.lg',
        content: '# greet\n- Hello!',
        path: Path.join(__dirname, '../../mocks/test.lg'),
        relativePath: Path.relative(proj.dir, Path.join(__dirname, '../../mocks/test.lg')),
      },
      {
        name: 'a.dialog',
        content: { old: 'value' },
        path: Path.join(__dirname, '../../mocks/a.dialog'),
        relativePath: Path.relative(proj.dir, Path.join(__dirname, '../../mocks/a.dialog')),
      },
    ];
    const aTemplate = {
      name: 'greet',
      body: '- Hello!',
    };
    await proj.lgIndexer.index(initFiles);

    const lgFiles = await proj.lgIndexer.getLgFiles();
    expect(lgFiles.length).toEqual(1);
    expect(aTemplate).toEqual(lgFiles[0].templates[0]);
  });
});
