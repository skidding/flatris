// @flow

import React, { Fragment, Component } from 'react';
import Link from 'next/link';
import { connect } from 'react-redux';
import { GAME_INACTIVE_TIMEOUT } from '../constants/timeouts';
import { createTimeoutBumper } from '../utils/timeout-bumper';
import { closeGame, removeGame } from '../actions/global';
import { withSocket } from './socket/SocketConnect';
import GamePreview from './GamePreview';

import type { GameId, Games, State } from '../types/state';
import type { RoomId } from '../types/api';

type Props = {
  games: Games,
  curGame: ?GameId,
  subscribe: (roomId: RoomId) => mixed,
  closeGame: () => mixed,
  removeGame: (gameId: GameId) => mixed
};

class Dashboard extends Component<Props> {
  bumpTimeout: (id: string) => mixed;

  constructor(props) {
    super(props);

    this.bumpTimeout = createTimeoutBumper({
      handlerCreator: this.createGameInactiveHandler,
      timeout: GAME_INACTIVE_TIMEOUT
    });
  }

  componentDidMount() {
    const { games, curGame, subscribe, closeGame } = this.props;

    subscribe('global');

    // clear state.curGame when navigating back to dashboard from game page
    if (curGame) {
      closeGame();
    }

    Object.keys(games).forEach(this.bumpTimeout);
  }

  componentDidUpdate({ games: prevGames }) {
    const { games } = this.props;
    Object.keys(games).forEach(gameId => {
      if (games[gameId] !== prevGames[gameId]) {
        this.bumpTimeout(gameId);
      }
    });
  }

  createGameInactiveHandler = (gameId: GameId) => () => {
    this.props.removeGame(gameId);
  };

  render() {
    const { games } = this.props;

    return (
      <Fragment>
        <div className="header">
          <Link href="/new">
            <a>Create game</a>
          </Link>
        </div>
        <div className="game-grid">
          {Object.keys(games).map(gameId => (
            <Link
              key={gameId}
              prefetch
              href={`/join?g=${gameId}`}
              as={`/join/${gameId}`}
            >
              <div className="game-preview">
                <GamePreview curUser={null} game={games[gameId]} />
              </div>
            </Link>
          ))}
        </div>
        <style jsx>{`
          .header {
            margin: 20px;
          }

          .game-grid {
            overflow: hidden; /* clear the floats old school style */
          }

          .game-preview {
            float: left;
            position: relative;
            width: 320px;
            height: 400px;
            margin: 0 0 20px 20px;
            font-size: 12px;
            cursor: pointer;
          }
        `}</style>
      </Fragment>
    );
  }
}

function mapStateToProps({ games, curGame }: State): $Shape<Props> {
  return {
    games,
    curGame
  };
}

const mapDispatchToProps = { closeGame, removeGame };

export default connect(mapStateToProps, mapDispatchToProps)(
  withSocket(Dashboard)
);
