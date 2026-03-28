import prisma from '../lib/prisma.js';
import type { PaginationParams } from '../lib/pagination.js';

export interface UserListItem {
  id: string;
  stellar_address: string | null;
  created_at: Date;
}

interface FindUsersResult {
  users: UserListItem[];
  total: number;
}

type UserRepositoryPrisma = {
  $transaction: (operations: [Promise<UserListItem[]>, Promise<number>]) => Promise<[UserListItem[], number]>;
  user: {
    findMany: (args: {
      select: {
        id: true;
        stellar_address: true;
        created_at: true;
      };
      orderBy: { created_at: 'desc' };
      skip: number;
      take: number;
    }) => Promise<UserListItem[]>;
    count: () => Promise<number>;
  };
};

export async function findUsers(params: PaginationParams): Promise<FindUsersResult> {
  const prismaClient = prisma as unknown as UserRepositoryPrisma;
  const [users, total] = await prismaClient.$transaction([
    prismaClient.user.findMany({
      select: {
        id: true,
        stellar_address: true,
        created_at: true,
      },
      orderBy: { created_at: 'desc' },
      skip: params.offset,
      take: params.limit,
    }),
    prismaClient.user.count(),
  ]);

  return { users, total };
}
