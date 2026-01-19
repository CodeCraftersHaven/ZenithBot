# ZenithBot

<div align="center" styles="margin-top: 10px">
  <img src="https://img.shields.io/badge/built_with-sern-pink?labelColor=%230C3478&color=%23ed5087&link=https%3A%2F%2Fsern.dev"/>
</div>

ZenithBot is a versatile bot coded in TypeScript, designed to enhance server management and user interaction through its robust features, including Giveaways, Tickets, Self Roles, and Counting.

- **Official Bot Link** ([ZenithBot](https://discord.com/oauth2/authorize?client_id=1339502442613702707))

## Features

- **Giveaways:** Host and manage exciting giveaways to engage your community.
- **Tickets:** Efficient ticketing system for handling user support and inquiries.
- **Self Roles:** Allow users to assign roles to themselves easily.
- **Counting:** Interactive counting system to keep users engaged. **coming soon**

## Installation

To get started with ZenithBot, follow these steps:
Please have Node.js, a bot from Discord Developers Page, and [optionally] Docker/Docker Compose set up on your host machine.

# Using yarn/npm/pnpm

1. Clone the repository:

   ```bash
   git clone https://github.com/CodeCraftersHaven/ZenithBot
   ```

2. Navigate to the project directory:

   ```bash
   cd ZenithBot
   ```

3. Setup env vars:<br>
   - Rename `.env.example` to `.env`<br>
   - Fill out all variables<br>
   - DATABASE_URL currently only supports mongodb

4. Install the required dependencies:

   ```bash
   yarn install
   ```

5. Build the bot:

   ```bash
   yarn build
   ```

6. Run the bot:
   ```bash
   yarn start
   ```

# Using Docker/Docker Compose

I've included both files to make this process simple. Highly recommend using docker compose for production.

## change {appname} to what you want the image to be named

### To use docker only, run these commands

- docker build --pull --rm -f 'Dockerfile' -t '{appname}:latest' '.'
- docker run --rm -d --env-file {appname}:latest

### To use docker compose, this is the only command you need

- docker compose -f 'docker-compose.yml' up -d --build
  - optionally you can replace `-d` with `-it` to watch the logs

## Usage

Once the bot is running, you can interact with it using the following commands:

- **Systems:** `/system enable [system] [channel]` - Enable systems to start using the bot.
- **Giveaways:** `/giveaway create [prize] [winners] [duration]` - Start a new giveaway.
- **Tickets:** `Just click the button in the channel you enable the ticket system in.` - Create a new support ticket.
- **Self Roles:** `**coming soon**` - Assign a role to yourself.
- **Counting:** `**coming soon**` - Participate in the counting game.

## Contributing

We welcome contributions to ZenithBot! If you have ideas for new features or improvements, please open an issue or submit a pull request. For major changes, please discuss them with us first to ensure they align with our goals.

## License

This project is licensed under the Apache 2.0 License - see the [LICENSE](LICENSE) file for details.

---

Thank you for using ZenithBot! We hope it enhances your server experience and brings value to your community.
