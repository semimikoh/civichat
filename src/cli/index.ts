import { config } from 'dotenv';
config({ path: '.env.local' });
import { Command } from 'commander';
import { fetchCommand } from '@/cli/commands/fetch';
import { embedCommand } from '@/cli/commands/embed';
import { searchCommand } from '@/cli/commands/search';
import { legalFetchCommand } from '@/cli/commands/legal-fetch';
import { legalEmbedCommand } from '@/cli/commands/legal-embed';
import { legalSearchCommand } from '@/cli/commands/legal-search';

const program = new Command();

program
  .name('civichat')
  .description('CiviChat CLI')
  .version('0.1.0');

program
  .command('hello')
  .description('동작 확인용 명령')
  .action(() => {
    console.log('CiviChat CLI 동작 확인 완료');
  });

program.addCommand(fetchCommand);
program.addCommand(embedCommand);
program.addCommand(searchCommand);
program.addCommand(legalFetchCommand);
program.addCommand(legalEmbedCommand);
program.addCommand(legalSearchCommand);

program.parse();
