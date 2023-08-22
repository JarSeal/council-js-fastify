import type { Types } from 'mongoose';

export type Edited = {
  user: Types.ObjectId;
  date: Date;
}[];

export type Token = {
  token: string | null;
  tokenId: string | null;
};
