import Debug from 'debug';
import { Context as TelegrafContext } from 'telegraf';
import commandEnum from '../lib/commandEnum';
import {
  addToLobby,
  createChat,
  findExistingChat,
  findLobby,
  findOpponentInLobby,
  getUser,
  leaveLobby,
} from '../lib/dataHandler';
import resource from '../resource';
const debug = Debug(`command:${commandEnum.findChat}`);

const findChatCommand = () => async (ctx: TelegrafContext) => {
  debug(`Triggered "${commandEnum.findChat}" command.`);

  const chatId = ctx.chat?.id;
  if (!chatId) {
    debug(resource.CHATID_NOT_FOUND);
    return await ctx.reply(resource.CHATID_NOT_FOUND);
  }

  const lobbyPromise = findLobby(chatId);
  const existingChatPromise = findExistingChat(chatId);
  const userPromise = getUser(chatId);
  const checkResults = await Promise.all([lobbyPromise, existingChatPromise, userPromise]);

  const lobby = checkResults[0];
  if (lobby) {
    await ctx.reply(`Waiting in the lobby. You can exit lobby via /${commandEnum.cancelFind} command.`);
    return;
  }

  const existingChat = checkResults[1];
  if (existingChat) {
    await ctx.reply(`You are in an active chat. To exit current chat type /${commandEnum.exitChat} and try again.`);
    return;
  }

  const user = checkResults[2];
  if (!user) {
    await ctx.reply(`User not found. Type /${commandEnum.start} to initialize user.`);
    return;
  }

  const opponent = await findOpponentInLobby(chatId, user.languageCode);

  if (opponent) {
    const chatStartMessage = `Chat started. You can exit chat via /${commandEnum.exitChat} command. Have fun.`;

    const leaveCurrentUserLobbyPromise = leaveLobby(chatId);
    const leaveOpponentUserLobbyPromise = leaveLobby(opponent.chatId);
    const createChatPromise = createChat(chatId, opponent.chatId, user.languageCode);
    const chatStartToCurrentUserPromise = ctx.reply(chatStartMessage);
    const chatStartToOpponentUserPromise = ctx.tg.sendMessage(opponent.chatId, chatStartMessage);

    return await Promise.all([
      leaveCurrentUserLobbyPromise,
      leaveOpponentUserLobbyPromise,
      createChatPromise,
      chatStartToCurrentUserPromise,
      chatStartToOpponentUserPromise,
    ]);
  } else {
    const addToLobbyPromise = addToLobby(chatId, user.languageCode);
    const lobbyMessagePromise = ctx.reply(
      `Waiting in the lobby. You can exit lobby via /${commandEnum.cancelFind} command.`,
    );

    return await Promise.all([addToLobbyPromise, lobbyMessagePromise]);
  }
};

export { findChatCommand };
