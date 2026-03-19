import { createApiClient } from "../lib/api-client.js";
import { UsageError } from "../lib/errors.js";

export async function listProducts(options: {
  configPath: string;
  url?: string | null;
  token?: string | null;
  account?: string | null;
  password?: string | null;
}): Promise<unknown[]> {
  const { client } = createApiClient({
    config: options.configPath,
    url: options.url,
    token: options.token,
    account: options.account,
    password: options.password,
  });
  return client.listProducts();
}

export async function getProduct(options: {
  configPath: string;
  productId: number;
  url?: string | null;
  token?: string | null;
  account?: string | null;
  password?: string | null;
}): Promise<unknown> {
  if (!Number.isInteger(options.productId) || options.productId <= 0) {
    throw new UsageError("product id 必须是大于 0 的整数。");
  }

  const products = await listProducts(options);
  const matched = products.find((item) => Number((item as { id?: unknown }).id) === options.productId);
  if (!matched) {
    throw new UsageError(`找不到产品 ${options.productId}。`);
  }
  return matched;
}
