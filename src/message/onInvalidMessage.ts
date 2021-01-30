import Debug from 'debug';
import { Context as TelegrafContext } from 'telegraf';
const debug = Debug('message:on_invalid');

const onInvalidMessage = (type: string) => async (ctx: TelegrafContext) => {
  debug(`Triggered invalid ${type} type.`);
  return await ctx.reply('Invalid input.');
};

export { onInvalidMessage };
