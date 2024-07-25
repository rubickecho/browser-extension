import { ActionPayload, availableActions } from './availableActions';

export type ParsedResponseSuccess = {
  thought: string;
  action: string;
  parsedAction: ActionPayload;
};

export type ParsedResponse =
  | ParsedResponseSuccess
  | {
      error: string;
    };

export function parseResponse(text: string): ParsedResponse {
  const thoughtMatch = text.match(/<Thought>(.*?)<\/Thought>/);
  const actionMatch = text.match(/<Action>(.*?)<\/Action>/);

  if (!thoughtMatch) {
    return {
      error: 'Invalid response: Thought not found in the model response.',
    };
  }

  if (!actionMatch) {
    return {
      error: 'Invalid response: Action not found in the model response.',
    };
  }

  const thought = thoughtMatch[1];
  const actionString = actionMatch[1];
  const actionPattern = /(\w+)\((.*?)\)/;
  const actionParts = actionString.match(actionPattern);
  console.log(
    'actionString: %s, actionPattern: %s, actionParts: %s',
    actionString,
    actionPattern,
    actionParts
  );
  if (!actionParts) {
    return {
      error:
        'Invalid action format: Action should be in the format functionName(arg1, arg2, ...).',
    };
  }

  const actionName = actionParts[1];
  const actionArgsString = actionParts[2];
  console.log(
    'actionName: %s, actionArgsString: %s, actionParts: %s',
    actionName,
    actionArgsString
  );

  const availableAction = availableActions.find(
    (action) => action.name === actionName
  );

  if (!availableAction) {
    return {
      error: `Invalid action: "${actionName}" is not a valid action.`,
    };
  }

  const argsArray = actionArgsString
    .split(',')
    .map((arg) => arg.trim())
    .filter((arg) => arg !== '');
  const parsedArgs: Record<string, number | string> = {};
  console.log('availableAction: %s, argsArray: %o', availableAction, argsArray);
  if (argsArray.length !== availableAction.args.length) {
    return {
      error: `Invalid number of arguments: Expected ${availableAction.args.length} for action "${actionName}", but got ${argsArray.length}.`,
    };
  }

  for (let i = 0; i < argsArray.length; i++) {
    const arg = argsArray[i];
    const expectedArg = availableAction.args[i];
    console.log('expectedArg:', expectedArg);
    if (expectedArg.type === 'number') {
      const numberValue = Number(arg);

      if (isNaN(numberValue)) {
        return {
          error: `Invalid argument type: Expected a number for argument "${expectedArg.name}", but got "${arg}".`,
        };
      }

      parsedArgs[expectedArg.name] = numberValue;
    } else if (expectedArg.type === 'string') {
      const stringValue =
        (arg.startsWith('"') && arg.endsWith('"')) ||
        (arg.startsWith("'") && arg.endsWith("'")) ||
        (arg.startsWith('`') && arg.endsWith('`'))
          ? arg.slice(1, -1)
          : null;

      if (stringValue === null) {
        return {
          error: `Invalid argument type: Expected a string for argument "${expectedArg.name}", but got "${arg}".`,
        };
      }

      parsedArgs[expectedArg.name] = stringValue.toString();
    } else {
      return {
        // @ts-expect-error this is here to make sure we don't forget to update this code if we add a new arg type
        error: `Invalid argument type: Unknown type "${expectedArg.type}" for argument "${expectedArg.name}".`,
      };
    }
  }
  console.log('parsedArgs:', parsedArgs);

  const parsedAction = {
    name: availableAction.name,
    args: parsedArgs,
  } as ActionPayload;

  return {
    thought,
    action: actionString,
    parsedAction,
  };
}
