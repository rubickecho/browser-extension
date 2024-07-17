import React, { useState, useEffect, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { Button, useToast } from '@chakra-ui/react';
import { useAppState } from '../state/store';

export const WebSocketUI = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [messageHistory, setMessageHistory] = useState<string[]>([]);
  const [connectionStatus, setConnectionStatus] = useState('Connecting');
  const [nextCount, setNextCount] = useState(0);

  const state = useAppState((state) => ({
    taskHistory: state.currentTask.history,
    taskStatus: state.currentTask.status,
    runTask: state.currentTask.actions.runTask,
    instructions: state.ui.instructions,
    setInstructions: state.ui.actions.setInstructions,
    interruptTask: state.currentTask.actions.interrupt
  }));

  const toast = useToast();

  const toastError = useCallback(
    (message: string) => {
      toast({
        title: 'Error',
        description: message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    },
    [toast]
  );

  useEffect(() => {    
    const newSocket = io('http://localhost:3000', {
      path: '/v1/ws/task'
    });

    newSocket.on('connect', () => {
      setConnectionStatus('Open');
    });

    newSocket.on('disconnect', () => {
      setConnectionStatus('Closed');
    });

    newSocket.on('connect_error', () => {
      setConnectionStatus('Error');
    });

    newSocket.on('task', (data: { message: string }) => {
      console.log('task result:', data);
      const message = data.message;
      setMessageHistory((prev) => [...prev, message]);
      setNextCount((preValue) => preValue + 1);
      state.setInstructions(message);
      state.runTask(toastError)
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  const runTask = () => {
    state.instructions && state.runTask(toastError);
  };

  const handleClickSendReady = useCallback(() => {
    if (socket) {
      socket.emit('ready', {});
    }
  }, [socket]);

  const handleClickSendNext = useCallback(() => {
    if (socket) {
      socket.emit('next', { next: nextCount });
    }
  }, [socket, nextCount]);

  return (
    <div>
      <h2>Current Next Count: { nextCount }</h2>
      <div>
        <Button
          onClick={handleClickSendReady}
          disabled={connectionStatus !== 'Open'}
        >
          Click Me to send 'ready'
        </Button>
      </div>
      <div>
        <Button
          onClick={handleClickSendNext}
          disabled={connectionStatus !== 'Open'}
        >
          Click Me to send 'next'
        </Button>
      </div>
      <div>
        <Button
          onClick={state.interruptTask}
        >
          STOP
        </Button>
      </div>
      <span>The WebSocket is currently {connectionStatus}</span>
      <ul>
        {messageHistory.map((message, idx) => (
          <span key={idx}>{message}</span>
        ))}
      </ul>
    </div>
  );
};