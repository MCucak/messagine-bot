import Debug from 'debug';
// import { Context as TelegrafContext } from 'telegraf';
import { getOpponentChatIds } from '../lib/common';
import { findExistingChat } from '../lib/dataHandler';
import resource from '../resource';
const debug = Debug('message:on_animation');

// TODO: animation could not be extracted from TelegrafContext
const onAnimationMessage = () => async (ctx: any) => {
  debug('Triggered "on_animation" message.');

  const chatId = ctx.chat?.id;
  if (!chatId) {
    debug(resource.CHATID_NOT_FOUND);
    return await ctx.reply(resource.CHATID_NOT_FOUND);
  }

  if (!(ctx?.message && 'animation' in ctx?.message)) {
    debug('Message animation not found.');
    return await ctx.reply('Message animation not found.');
  }

  const messageAnimation = ctx.message.animation;
  const existingChat = await findExistingChat(chatId);
  if (!existingChat) {
    debug(resource.CHAT_NOT_EXIST);
    return await ctx.reply(resource.CHAT_NOT_EXIST);
  }

  const opponentChatIds = getOpponentChatIds(existingChat, chatId);
  const opponentPromises: Promise<any>[] = [];
  opponentChatIds.forEach(opponentChatId => {
    const opponentPromise = ctx.tg.sendAnimation(opponentChatId, messageAnimation.file_id);
    opponentPromises.push(opponentPromise);
  });
  return await Promise.all(opponentPromises);
};

export { onAnimationMessage };
