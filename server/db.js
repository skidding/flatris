// @flow

import crypto from 'crypto';
import { without, sortBy } from 'lodash';
import { getBlankGame } from '../reducers/game';
import { MAX_NAME_LENGTH } from '../constants/user';
import {
  GAME_INACTIVE_TIMEOUT,
  GAME_EXPIRE_TIMEOUT
} from '../constants/timeouts';
import { createTimeoutBumper } from '../utils/timeout-bumper';
import { incrementGameTime } from './firebase';

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

export const { bumpTimeout } = createTimeoutBumper(
  {
    handler: handleInactiveGame,
    timeout: GAME_INACTIVE_TIMEOUT
  },
  {
    handler: handleExpiredGame,
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
  bumpActiveGame(gameId);

  return game;
}

export function saveGameAction(action: GameAction): void {
  const { gameId } = action.payload;

  gameActions[gameId].push(action);
}

export function bumpActiveGame(gameId: GameId) {
  // Inactive games will not be shown in the dashboard after some time, and
  // removed completely after more time
  if (activeGames.indexOf(gameId) === -1) {
    activeGames.push(gameId);
  }

  bumpTimeout(gameId);
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

  countGameTime(games[gameId], gameActions[gameId]);

  delete games[gameId];
  delete gameActions[gameId];
  markGameInactive(gameId);

  // Show stats after removing a game from memory
  showGameStats();
}

function markGameInactive(gameId: GameId) {
  activeGames = without(activeGames, gameId);
}

function handleInactiveGame(gameId: GameId) {
  console.log(`Game marked inactive ${gameId}`);
  markGameInactive(gameId);
}

function handleExpiredGame(gameId: GameId) {
  console.log(`Game expired ${gameId}`);
  removeGame(gameId);
}

function countGameTime(game: Game, actions: Array<GameAction>) {
  const times = [];

  game.players.forEach(({ user }) => {
    const playerActions = actions.filter(a => a.payload.userId === user.id);
    if (playerActions.length > 1) {
      times.push(countPlayerSeconds(playerActions));
    }
  });

  // Count play time of each player
  const time = times.reduce((a, b) => a + b, 0);
  if (time > 0) {
    incrementGameTime(time);
  }
}

function countPlayerSeconds(playerActions: Array<GameAction>) {
  const sortedActions = sortBy(playerActions, a => a.payload.actionId);
  let prevAction;
  let ms = 0;

  sortedActions.forEach(action => {
    if (prevAction) {
      const timeBetweenActions =
        action.payload.actionId - prevAction.payload.actionId;

      // Don't count any break bigger than 30s between action as play time.
      // That would be cheating ;)
      if (timeBetweenActions < 30000) {
        ms += timeBetweenActions;
      }
    }

    prevAction = action;
  });

  return Math.round(ms / 1000);
}

function showGameStats() {
  const gameIds = Object.keys(games);
  const actionCount = gameIds.reduce(
    (acc, gameId) => acc + gameActions[gameId].length,
    0
  );
  console.log(`Total games: ${gameIds.length}`);
  console.log(`Total game actions: ${actionCount}`);
  console.log(`Active games: ${activeGames.length}`);
}
