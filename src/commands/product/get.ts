import type { CliRunArgs } from "../../cli/types.js";
import { getPositional, getStringOption } from "../../lib/cli.js";
import { UsageError } from "../../lib/errors.js";
import { getProduct } from "../../services/product.js";

function parseProductId(args: CliRunArgs): number {
  const rawId = getPositional(args, 0);
  const productId = Number(rawId);
  if (!Number.isInteger(productId) || productId <= 0) {
    throw new UsageError("product get 需要一个大于 0 的产品 id。");
  }
  return productId;
}

export async function run(args: CliRunArgs): Promise<unknown> {
  return getProduct({
    configPath: args.configPath,
    productId: parseProductId(args),
    url: getStringOption(args, "url"),
    token: getStringOption(args, "token"),
    account: getStringOption(args, "account"),
    password: getStringOption(args, "password"),
  });
}

export default run;
