import Debug from 'debug';
import { Context as TelegrafContext, Telegraf } from 'telegraf';
import { BotCommand } from 'telegraf/typings/telegram-types';
import {
  cancelFindCommand,
  exitChatCommand,
  findChatCommand,
  helpCommand,
  languageMenuMiddleware,
  setLanguageCommand,
  startCommand,
  statsCommand,
} from '../commands';
import config from '../config';
import {
  onAnimationMessage,
  onContactMessage,
  onDocumentMessage,
  onInvalidMessage,
  onLocationMessage,
  onPhotoMessage,
  onStickerMessage,
  onTextMessage,
  onVideoMessage,
  onVoiceMessage,
} from '../message';
import resource from '../resource';
import commandEnum from './commandEnum';
import { connect } from './dataHandler';
import { ok } from './responses';
const debug = Debug('lib:telegram');

export const bot = new Telegraf(config.BOT_TOKEN);

async function botUtils() {
  await connect();
  const languageMenu = languageMenuMiddleware();

  bot.use(Telegraf.log());
  bot.use(logger);
  bot.use(languageMenu);

  bot
    .command(commandEnum.start, startCommand())
    .command(commandEnum.findChat, findChatCommand())
    .command(commandEnum.setLanguage, setLanguageCommand(languageMenu))
    .command(commandEnum.exitChat, exitChatCommand())
    .command(commandEnum.cancelFind, cancelFindCommand())
    .command(commandEnum.help, helpCommand())
    .command(commandEnum.stats, statsCommand())
    .on('animation', onAnimationMessage())
    .on('contact', onContactMessage())
    .on('document', onDocumentMessage())
    .on('location', onLocationMessage())
    .on('photo', onPhotoMessage())
    .on('sticker', onStickerMessage())
    .on('text', onTextMessage())
    .on('video', onVideoMessage())
    .on('voice', onVoiceMessage())
    .on('game', onInvalidMessage('game'))
    .on('poll', onInvalidMessage('poll'))
    .on('venue', onInvalidMessage('venue'));
}

async function localBot() {
  debug('Bot is running in development mode');

  const botInfo = await bot.telegram.getMe();

  // tslint:disable-next-line: no-console
  console.info('Server has initialized bot username: ', botInfo.username);

  debug(`deleting webhook`);
  await bot.telegram.deleteWebhook();

  debug(`starting polling`);
  await bot.start();
}

export async function status() {
  await syncWebhook();
  await syncCommands();

  return ok('Listening to bot events...');
}

async function syncWebhook() {
  const getWebhookInfo = await bot.telegram.getWebhookInfo();
  const expectedWebhookUrl = getWebhookUrl();

  if (getWebhookInfo.url !== expectedWebhookUrl) {
    debug(`deleting webhook`);
    await bot.telegram.deleteWebhook();
    debug(`setting webhook to ${expectedWebhookUrl}`);
    await bot.telegram.setWebhook(expectedWebhookUrl);
  }
}

function getWebhookUrl(): string {
  if (!config.ENDPOINT_URL) {
    throw new Error('ENDPOINT_URL is not set.');
  }
  if (!config.WEBHOOK_PATH) {
    throw new Error('WEBHOOK_PATH is not set.');
  }

  const webhookUrl = `${config.ENDPOINT_URL}/${config.WEBHOOK_PATH}`;
  return webhookUrl;
}

async function syncCommands() {
  const myCommands = await bot.telegram.getMyCommands();
  const commandsSetProperly = checkCommands(myCommands);
  if (!commandsSetProperly) {
    debug(`setting new commands`);
    await bot.telegram.setMyCommands(commands);
  }
}

const commands: BotCommand[] = [
  { command: commandEnum.findChat, description: resource.FIND_CHAT_COMMAND_DESC },
  { command: commandEnum.exitChat, description: resource.EXIT_CHAT_COMMAND_DESC },
  { command: commandEnum.setLanguage, description: resource.SET_LANGUAGE_COMMAND_DESC },
  { command: commandEnum.cancelFind, description: resource.CANCEL_FIND_COMMAND_DESC },
  { command: commandEnum.help, description: resource.HELP_COMMAND_DESC },
  { command: commandEnum.stats, description: resource.STATS_COMMAND_DESC },
];

function checkCommands(existingCommands: BotCommand[]) {
  const commandsLength = commands.length;
  if (existingCommands.length !== commandsLength) {
    return false;
  }
  for (let i = 0; i < commandsLength; i++) {
    const command = commands[i];
    const existingCommand = existingCommands[i];
    if (command.command !== existingCommand.command) {
      return false;
    }
    if (command.description !== existingCommand.description) {
      return false;
    }
  }
  return true;
}

export async function webhook(event: any) {
  // call bot commands and middlware
  await botUtils();

  const body = JSON.parse(event.body);
  const launchOptions: Telegraf.LaunchOptions = {
    webhook: {
      domain: config.ENDPOINT_URL,
      hookPath: config.WEBHOOK_PATH,
    },
  };
  await bot.launch(launchOptions);
  await bot.handleUpdate(body);
  return ok('Success');
}

export const logger = async (_: TelegrafContext, next: any): Promise<void> => {
  const logStart = new Date();
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  await next();
  const ms = new Date().getTime() - logStart.getTime();
  // tslint:disable-next-line: no-console
  console.log('Response time: %sms', ms);
};

if (config.IS_DEV) {
  // tslint:disable-next-line: no-console
  console.log('isDev', config.IS_DEV);

  localBot().then(() => {
    // call bot commands and middlware
    botUtils().then(() => {
      // launch bot
      bot.launch();
    });
  });
}
