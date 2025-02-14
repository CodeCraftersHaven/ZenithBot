export const getDiscordTimestamp = (): string => {
  const unixTimestamp = Math.floor(Date.now() / 1000); // Convert milliseconds to seconds
  return `<t:${unixTimestamp}:f>`; // 'f' for full date & time
};

export const getDiscordTimestampFromUnix = (unixTimestamp: number): string => {
  return `<t:${unixTimestamp}:f>`; // 'f' for full date & time
};

export const capFirstLetter = (str: string): string => {
  return str.charAt(0).toUpperCase() + str.slice(1);
};
