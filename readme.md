
# Telegram to Threads Bot

A Node.js bot that captures images and text from a specific Telegram group and posts them to Threads using the Threads API.

## Features

- Listens for images and text messages in a specific Telegram group.
- Automatically posts captured images and captions to Threads.
- Posts text-only messages to Threads if no image is provided.

## Prerequisites

- [Node.js](https://nodejs.org/en/download/) (v14 or higher)
- A Telegram bot (created using [BotFather](https://core.telegram.org/bots#botfather))
- Access to the Threads API and an API token

## Project Structure

```
telegram-threads-bot/
├── .env                # Environment variables
├── bot.js              # Main bot logic
├── package.json        # Project metadata and dependencies
└── node_modules/       # Installed packages
```

## Setup

### 1. Clone the Repository

```bash
git clone https://github.com/sachin-007/telegram-to-threads-bot.git
cd telegram-threads-bot
```

### 2. Install Dependencies

Run the following command to install the required Node.js packages:

```bash
npm install
```

### 3. Create a `.env` File

In the project root, create a `.env` file with the following contents:

```
BOT_TOKEN=your_telegram_bot_token
THREADS_API_TOKEN=your_threads_api_token
```

- Replace `your_telegram_bot_token` with the token you received from [BotFather](https://core.telegram.org/bots#botfather).
- Replace `your_threads_api_token` with your Threads API token.

### 4. Running the Bot

To start the bot, run:

```bash
node bot.js
```

The bot will now be active and listening to messages in your group.

### 5. Deploying (Optional)

To deploy the bot to a platform like Heroku or AWS, follow the platform-specific steps to deploy a Node.js application.

For example, to deploy on Heroku:

1. Create a new Heroku app:
    ```bash
    heroku create
    ```

2. Add your environment variables to Heroku:
    ```bash
    heroku config:set BOT_TOKEN=your_telegram_bot_token THREADS_API_TOKEN=your_threads_api_token
    ```

3. Deploy your app:
    ```bash
    git push heroku master
    ```

## Usage

- Add the bot to your desired Telegram group.
- When users post an image or text in the group, the bot will capture the content and post it to Threads using the provided API.

## Example

1. User posts an image with a caption in the Telegram group.
2. The bot retrieves the image URL and caption.
3. The bot sends a request to the Threads API to create a post with the image and caption.

## Technologies Used

- **Telegraf**: A modern Telegram bot framework for Node.js.
- **Axios**: A promise-based HTTP client for making API requests.
- **Dotenv**: For managing environment variables securely.

## Contributing

1. Fork the repository.
2. Create a new branch: `git checkout -b feature-branch`.
3. Make your changes and commit: `git commit -m 'Add new feature'`.
4. Push to the branch: `git push origin feature-branch`.
5. Submit a pull request.

<!-- ## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details. -->
