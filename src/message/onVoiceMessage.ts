import Debug from 'debug';
import { Context as TelegrafContext } from 'telegraf';
import { getOpponentChatIds } from '../lib/common';
import { findExistingChat } from '../lib/dataHandler';
import resource from '../resource';
const debug = Debug('message:on_voice');

const onVoiceMessage = () => async (ctx: TelegrafContext) => {
  debug('Triggered "on_voice" message.');

  const chatId = ctx.chat?.id;
  if (!chatId) {
    debug(resource.CHATID_NOT_FOUND);
    return await ctx.reply(resource.CHATID_NOT_FOUND);
  }

  if (!(ctx?.message && 'voice' in ctx?.message)) {
    debug('Message voice not found.');
    return await ctx.reply('Message voice not found.');
  }

  const messageVoice = ctx.message.voice;
  const existingChat = await findExistingChat(chatId);
  if (!existingChat) {
    debug(resource.CHAT_NOT_EXIST);
    return await ctx.reply(resource.CHAT_NOT_EXIST);
  }

  const opponentChatIds = getOpponentChatIds(existingChat, chatId);
  const opponentPromises: Promise<any>[] = [];
  opponentChatIds.forEach(opponentChatId => {
    const opponentPromise = ctx.tg.sendVoice(opponentChatId, messageVoice.file_id);
    opponentPromises.push(opponentPromise);
  });
  return await Promise.all(opponentPromises);
};

export { onVoiceMessage };
