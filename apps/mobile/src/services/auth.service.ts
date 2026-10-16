import { api, WriteOptions } from './api';

export interface Account {
  id: string;
  name: string;
  email: string;
  salutation: 'NONE' | 'SR' | 'SRA' | 'CUSTOM';
  salutation_custom: string | null;
}

export interface AccountUpdateDto {
  name?: string;
  email?: string;
  current_password?: string;
  new_password?: string;
  salutation?: 'NONE' | 'SR' | 'SRA' | 'CUSTOM';
  salutation_custom?: string | null;
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
