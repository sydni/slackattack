import botkit from 'botkit';

// this is es6 syntax for importing libraries
// in older js this would be: var botkit = require('botkit')

console.log('starting bot');

import Yelp from 'yelp';

const yelp = new Yelp({
  consumer_key: 'Mm9JyZAXvfGL4uQzVCoC1Q',
  consumer_secret: 'AnPxMHKpZYdduI3XhdP0TtDdr_w',
  token: 'nRxYF0X0vjU8qSlqcUEo_Syh_ZXXJ_vk',
  token_secret: '88wbOCX2jOW7iKjL5WIyKjNDPRc',
});

const controller = botkit.slackbot({
  debug: false,
});

// initialize slackbot
const slackbot = controller.spawn({
  token: process.env.SLACK_BOT_TOKEN,
  // this grabs the slack token we exported earlier
}).startRTM(err => {
  // start the real time message client
  if (err) { throw new Error(err); }
});

// prepare webhook
// for now we won't use this but feel free to look up slack webhooks
controller.setupWebserver(process.env.PORT || 3001, (err, webserver) => {
  controller.createWebhookEndpoints(webserver, slackbot, () => {
    if (err) { throw new Error(err); }
  });
});

controller.hears(['hello', 'hi', 'howdy'], ['direct_message', 'direct_mention', 'mention'], (bot, message) => {
  bot.api.users.info({ user: message.user }, (err, res) => {
    if (res) {
      bot.reply(message, `Hello, ${res.user.profile.first_name}!`);
    } else {
      bot.reply(message, 'Hello there!');
    }
  });
});


controller.hears(['help'], ['direct_message', 'direct_mention', 'mention'], (bot, message) => {
  bot.reply(message, 'Hello, I am hot_bot! I can help you look for food near you, or ask you questions!');
});


// adapted from https://github.com/howdyai/botkit
controller.hears(['ask me', 'question'], ['direct_message', 'direct_mention', 'mention'], (bot, message) => {
  // start a conversation to handle this response.
  bot.startConversation(message, (err, convo) => {
    convo.ask('What do you think the meaning of life is?', [
      {
        pattern: '42',
        callback: (response, convo) => {
          convo.say('What a creative answer');
          convo.ask('Do you read a lot?', [
            {
              pattern: bot.utterances.yes,
              callback: (response, convo) => {
                convo.say('Cool me too!');
                convo.ask('What is your favorite book?', (book, convo) => {
                  convo.say(`${book.text} is a great book. Talk to you later!`);
                  convo.next();
                });
                convo.next();
              },
            },
            {
              pattern: bot.utterances.no,
              callback: (response, convo) => {
                convo.say('You should read more. Talk to you later!');
                convo.next();
              },
            },
          ]);
          convo.next();
        },
      },
      {
        pattern: 'food',
        callback(response, convo) {
          convo.say('We should catch up and get a meal sometime!');
          convo.ask('Are you free tomorrow?', [
            {
              pattern: bot.utterances.yes,
              callback: (response, convo) => {
                convo.ask('What time are you free?', (time, convo) => {
                  convo.say(`Great! Let's meet at Foco at ${time.text}. See you then!`);
                  convo.next();
                });
                convo.next();
              },
            },
            {
              pattern: bot.utterances.no,
              callback: (response, convo) => {
                convo.say('Ouch.');
                convo.next();
              },
            },
            {
              default: true,
              callback: (response, convo) => {
                convo.say('I don\'t understand.');
                convo.repeat();
                convo.next();
              },
            },
          ]);
          convo.next();
          convo.next();
        },
      },
      {
        pattern: 'fun',
        callback(response, convo) {
          convo.say('You seem like a cool dude.');
          convo.next();
        },
      },
      {
        default: true,
        callback(response, convo) {
          convo.say('Wrong.');
          convo.repeat();
          convo.next();
        },
      },
    ]);
  });
});


controller.hears(['food', 'hungry'], ['direct_message', 'direct_mention', 'mention'], (bot, message) => {
  bot.startConversation(message, (response, con) => {
    con.ask('What do you want to eat?', (food, conv) => {
      conv.say(`You want ${food.text}?`); // figureout how to concatenate strings
      conv.ask('Where are you?', (location, convo) => {
        // cite this later

        yelp.search({ term: food.text, location: location.text, limit: 1 })
        .then((data) => {
          convo.say(`Finding results near ${location.text}`);
          convo.next();
          console.log(data);

          const business = data.businesses.map(post => {
            convo.say(post.name);

            // https://github.com/howdyai/botkit#botreply
            const replyAttachments = {
              text: `You should go to ${post.name}!`,
              attachments: [
                {
                  fallback: 'Oops! Something went wrong.',
                  pretext: `Rating: ${post.rating}`,
                  title: post.name,
                  image_url: post.image_url,
                  text: post.snippet_text,
                  color: '#7CD197',
                },
              ],
            };

            bot.reply(message, replyAttachments);

            convo.next();
            return post.name;
          });

          console.log(business);
        })
        .catch((err) => {
          console.error(err);
        });

        convo.next();
      });
      conv.next();
    });
  });
});

controller.on('outgoing_webhook', (bot, message) => {
  bot.replyPublic(message, 'yeah yeah I\'m awake');
});


controller.on('direct_message', (bot, message) => {
  bot.reply(message, 'What are you even talking about?');
});
