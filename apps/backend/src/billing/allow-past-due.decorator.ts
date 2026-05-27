import { SetMetadata } from '@nestjs/common';

export const ALLOW_PAST_DUE_KEY = 'allowPastDue';
export const AllowPastDue = () => SetMetadata(ALLOW_PAST_DUE_KEY, true);
