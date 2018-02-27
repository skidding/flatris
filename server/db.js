// @flow

import crypto from 'crypto';
import { without } from 'lodash';
import { getBlankGame } from '../reducers/game';
import { MAX_NAME_LENGTH } from '../constants/user';
import {
  GAME_INACTIVE_TIMEOUT,
  GAME_EXPIRE_TIMEOUT
} from '../constants/timeouts';
import { createTimeoutBumper } from '../utils/timeout-bumper';

import type { GameId, Game, UserId, User } from '../types/state';
import type { GameAction } from '../types/actions';

export type SessionId = string;
export type Session = { id: SessionId, userId: UserId };

export type Users = { [id: UserId]: User };
export type Sessions = { [id: SessionId]: Session };
export type Games = { [id: GameId]: Game };
export type GameActions = { [id: GameId]: Array<GameAction> };
export type ActiveGames = Array<GameId>;

export const users: Users = {};
export const sessions: Sessions = {};
export const games: Games = {};
export const gameActions: GameActions = {};
export let activeGames: ActiveGames = [];

export const bumpActiveGame = createTimeoutBumper(
  {
    handlerCreator: createGameInactiveHandler,
    timeout: GAME_INACTIVE_TIMEOUT
  },
  {
    handlerCreator: createGameExpiredHandler,
    timeout: GAME_EXPIRE_TIMEOUT
  }
);

export function insertUser(name: string): User {
  const userId = genRandUniqId(users);
  const user = { id: userId, name: name.substring(0, MAX_NAME_LENGTH) };
  users[userId] = user;

  return user;
}

export function insertSession(userId: UserId): Session {
  const sessionId = genRandUniqId(sessions);
  const session = { id: sessionId, userId };
  sessions[sessionId] = session;

  return session;
}

export function insertGame(user: User): Game {
  const gameId = genRandUniqId(games);
  const game = getBlankGame({ id: gameId, user });
  games[gameId] = game;
  gameActions[gameId] = [];

  // Inactive games will not be shown in the dashboard after some time, and
  // removed completely after more time
  activeGames.push(gameId);
  bumpActiveGame(gameId);

  return game;
}

export function saveGameAction(action: GameAction): void {
  const { gameId } = action.payload;

  gameActions[gameId].push(action);
}

function genRandUniqId(collection: { [id: string]: any }): string {
  let id;
  do {
    id = genRandId();
  } while (collection[id]);

  return id;
}

function genRandId(): string {
  return crypto.randomBytes(4).toString('hex');
}

function removeGame(gameId: GameId) {
  console.log(`Removing game ${gameId}...`);

  delete games[gameId];
  delete gameActions[gameId];
  markGameInactive(gameId);

  // Show stats after removing a game from memory
  const gameIds = Object.keys(games);
  const actionCount = gameIds.reduce(
    (acc, gameId) => acc + gameActions[gameId].length,
    0
  );
  console.log(`Total games: ${gameIds.length}`);
  console.log(`Total game actions: ${actionCount}`);
  console.log(`Active games: ${activeGames.length}`);
}

function markGameInactive(gameId: GameId) {
  activeGames = without(activeGames, gameId);
}

function createGameInactiveHandler(gameId: GameId) {
  return () => {
    console.log(`Game marked as inactive ${gameId}`);
    markGameInactive(gameId);
  };
}

function createGameExpiredHandler(gameId: GameId) {
  return () => {
    console.log(`Removing expired game ${gameId}`);
    removeGame(gameId);
  };
}
