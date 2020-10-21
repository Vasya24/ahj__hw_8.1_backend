const http = require('http');
const Koa = require('koa');
const koaBody = require('koa-body');
const Router = require('koa-router');
const { streamEvents } = require('http-event-stream');
const uuid = require('uuid');
const router = new Router();
const app = new Koa();

app.use(koaBody({
    urlencoded: true,
    multipart: true,
    json: true,
}));

app.use(async (ctx, next) => {
    const origin = ctx.request.get('Origin');
    if (!origin) {
      return await next();
    }

    const headers = { 'Access-Control-Allow-Origin': '*', };

    if (ctx.request.method !== 'OPTIONS') {
      ctx.response.set({...headers});
      try {
        return await next();
      } catch (e) {
        e.headers = {...e.headers, ...headers};
        throw e;
      }
    }

    if (ctx.request.get('Access-Control-Request-Method')) {
      ctx.response.set({
        ...headers,
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH',
      });

      if (ctx.request.get('Access-Control-Request-Headers')) {
        ctx.response.set('Access-Control-Allow-Headers', ctx.request.get('Access-Control-Request-Headers'));
      }

      ctx.response.status = 204;
    }
  });

  function initDate() {
    const date = new Date();
    const day = date.getDate();
    const month = date.getMonth();
    const year = date.getFullYear().toString().slice(2);
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const seconds = date.getSeconds();
    return `${hours < 10 ? '0' : ''}${hours}:${minutes < 10 ? '0' : ''}${minutes}:${seconds < 10 ? '0' : ''}${seconds} ${day < 10 ? '0' : ''}${day}.${month < 10 ? '0' : ''}${month}.${year}`;
  }

  let count = 0;
  const reports = [];

  reports.push({
    event: 'comment',
    data: JSON.stringify({
      type: 'start',
      message: 'Игра началась',
      date: initDate()
    }),
    id: uuid.v4()
  });

  const interval = setInterval(() => {
    const events = [
      {
        type: 'action',
        message: 'Идёт перемещение мяча по полю, игроки и той, и другой команды активно пытаются атаковать'
      },
      {
        type: 'freekick',
        message: 'Нарушение правил, будет штрафной удар'
      },
      {
        type: 'goal',
        message: 'Отличный удар! И Г-О-О-О-Л!'
      }
    ];

    let index = 0;
    const random = Math.floor(Math.random() * 10);
    if (random < 1) {
      index = 2;
    } else if (random < 5) {
      index = 1;
    }

    reports.push({
      event: 'comment',
      data: JSON.stringify({
        type: events[index].type,
        message: events[index].message,
        date: initDate()
      }),
      id: uuid.v4()
    });

    count++;
    if (count > 50) clearInterval(interval);
  }, 3000);


  router.get('/sse', async (ctx) => {
    streamEvents(ctx.req, ctx.res, {
      async fetch(lastEventId) {
        console.log(lastEventId);
        return [];
      },
      stream(sse) {
        let i = 0;
        const interval = setInterval(() => {
          if (reports.length > i) {
            sse.sendEvent(reports[i]);
            i++;
          }
          if (i > 50) clearInterval(interval);

        }, 3000);
        return () => clearInterval(interval);
      }
    });
    ctx.respond = false;
  });

  app.use(router.routes()).use(router.allowedMethods());

  const port = process.env.PORT || 4242;
  http.createServer(app.callback()).listen(port);
