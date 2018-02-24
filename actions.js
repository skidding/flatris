/* global performance */
// @flow

import raf from 'raf';

import { DROP_FRAMES_ACCELERATED } from './constants/grid';
import { getPlayer, allPlayersReady } from './reducers/game';
import { getCurGame } from './reducers/cur-game';
import { getCurUser } from './reducers/cur-user';

import type { UserId, User, GameId, Game } from './types/state';
import type {
  ActionId,
  AuthAction,
  LoadGameAction,
  JoinGameAction,
  Action,
  ThunkAction,
  Dispatch,
  GetState
} from './types/actions';

const now =
  typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? () => performance.now()
    : () => Date.now();

const FPS = 60;
const frameDuration = 1000 / FPS;

// This changes too fast (60fps) to keep it in the store's state
let yProgress = 0;

export function auth(user: User): AuthAction {
  return {
    type: 'AUTH',
    payload: { user }
  };
}

export function loadGame(game: Game): LoadGameAction {
  return {
    type: 'LOAD_GAME',
    payload: {
      game
    }
  };
}

export function joinGame(gameId: GameId, user: User): JoinGameAction {
  return {
    type: 'JOIN_GAME',
    payload: {
      actionId: getActionId(),
      gameId,
      user
    }
  };
}

export function playerReady(): ThunkAction {
  return decorateGameAction(({ actionId, userId, gameId }) => ({
    type: 'PLAYER_READY',
    payload: {
      actionId,
      userId,
      gameId
    }
  }));
}

export function playerPause(): ThunkAction {
  return decorateGameAction(({ actionId, userId, gameId }) => ({
    type: 'PLAYER_PAUSE',
    payload: {
      actionId,
      userId,
      gameId
    }
  }));
}

export function runGameFrame(drop: (rows: number) => any): ThunkAction {
  return (dispatch: Dispatch, getState: GetState) => {
    cancelGameFrame();

    scheduleFrame(frames => {
      if (frames > 3) {
        console.warn(`Perf degrated: ${frames - 1} frames skipped.`);
      }

      const state = getState();
      const userId = getCurUser(state).id;
      const game = getCurGame(state);
      const { dropFrames } = game;
      const player = getPlayer(game, userId);
      const { dropAcceleration } = player;

      // Stop animation when game ended (players change status to WON/LOST)
      if (!allPlayersReady(game)) {
        return;
      }

      const framesPerDrop = dropAcceleration
        ? DROP_FRAMES_ACCELERATED
        : dropFrames;

      yProgress += frames / framesPerDrop;

      if (yProgress > 1) {
        const rows = Math.floor(yProgress);
        drop(rows);

        yProgress %= 1;
      }

      dispatch(runGameFrame(drop));
    });
  };
}

export function cancelGameFrame() {
  raf.cancel(animationHandle);
}

export function drop(rows: number): ThunkAction {
  return decorateGameAction(({ actionId, userId, gameId }) => ({
    type: 'DROP',
    payload: {
      actionId,
      userId,
      gameId,
      rows
    }
  }));
}

export function moveLeft(): ThunkAction {
  return decorateGameAction(({ actionId, userId, gameId }) => ({
    type: 'MOVE_LEFT',
    payload: {
      actionId,
      userId,
      gameId
    }
  }));
}

export function moveRight(): ThunkAction {
  return decorateGameAction(({ actionId, userId, gameId }) => ({
    type: 'MOVE_RIGHT',
    payload: {
      actionId,
      userId,
      gameId
    }
  }));
}

export function rotate(): ThunkAction {
  return decorateGameAction(({ actionId, userId, gameId }) => ({
    type: 'ROTATE',
    payload: {
      actionId,
      userId,
      gameId
    }
  }));
}

export function enableAcceleration(): ThunkAction {
  return decorateGameAction(({ actionId, userId, gameId }) => ({
    type: 'ENABLE_ACCELERATION',
    payload: {
      actionId,
      userId,
      gameId
    }
  }));
}

export function disableAcceleration(): ThunkAction {
  return decorateGameAction(({ actionId, userId, gameId }) => ({
    type: 'DISABLE_ACCELERATION',
    payload: {
      actionId,
      userId,
      gameId
    }
  }));
}

export function appendPendingBlocks(): ThunkAction {
  return decorateGameAction(({ actionId, userId, gameId }) => ({
    type: 'APPEND_PENDING_BLOCKS',
    payload: {
      actionId,
      userId,
      gameId
    }
  }));
}

export function ping(): ThunkAction {
  return decorateGameAction(({ actionId, userId, gameId }) => ({
    type: 'PING',
    payload: {
      actionId,
      userId,
      gameId,
      time: Date.now()
    }
  }));
}

let animationHandle;
let timeBegin;

function scheduleFrame(cb) {
  timeBegin = now();
  animationHandle = raf(() => {
    const timeEnd = now();
    cb((timeEnd - timeBegin) / frameDuration);
  });
}

type GameActionDecorator = ({
  actionId: ActionId,
  gameId: GameId,
  userId: UserId
}) => Action;

function decorateGameAction(fn: GameActionDecorator): ThunkAction {
  return (dispatch: Dispatch, getState: GetState) => {
    const state = getState();
    const userId = getCurUser(state).id;
    const gameId = getCurGame(state).id;
    // TODO: Send state.player.lastActionId
    const actionId = getActionId();

    return dispatch(fn({ actionId, userId, gameId }));
  };
}

function getActionId(prevActionId: number = 0): ActionId {
  return Math.max(Date.now(), prevActionId + 1);
}
