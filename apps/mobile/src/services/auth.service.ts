import { api, WriteOptions } from './api';

export interface Account {
  id: string;
  name: string;
  email: string;
}

export interface AccountUpdateDto {
  name?: string;
  email?: string;
  current_password?: string;
  new_password?: string;
}

export interface AccountUpdateResult {
  account: Account;
  access_token?: string;
  refresh_token?: string;
}

export const authService = {
  async getAccount(): Promise<Account> {
    return api.get<Account>('/auth/account');
  },

  async updateAccount(dto: AccountUpdateDto, opts?: WriteOptions): Promise<AccountUpdateResult> {
    return api.patch<AccountUpdateResult>('/auth/account', dto, opts);
  },
};
