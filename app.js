(async function() {
    const Koa = require('koa');
    const Static = require('koa-static-cache');
    const Router = require('koa-router');
    const Bodyparser = require('koa-bodyparser')
    const fs = require('fs');
    const mysql = require('mysql2/promise');

    const app = new Koa();

    app.use(Static('./static', {
        prefix: '/static',
        gzip: true
    }))

    const connection = await mysql.createConnection({
        host: '127.0.0.1',
        user: 'root',
        password: 'root',
        database: 'test1'
    });

    const router = new Router();

    app.use(Bodyparser());

    router.get('/', ctx => {
        const content = fs.readFileSync('./static/index.html')
        ctx.body = content.toString()
    })

    router.get('/todos', async ctx => {
        // ctx.body = [
        //     { id: 1, title: '学习node', done: false },
        //     { id: 2, title: '学习koa', done: false },
        //     { id: 3, title: '学习mysql', done: false }
        // ]

        /** 
         * ORDER BY 
         * ORDER BY done DESC,id DESC
         * 
         * */

        /** 
         * 查询数量限制
         * LIMIT - top 10
         * 查询偏移
         * OFFSET
         * 
         * 分页
         * 把一定的数据按照每页固定的条数去显示，我们需要首先定义每页显示多少
         * 
         * 每页显示3条
         * 每页显示 -> LIMIT
         * 当前的页码 -> OFFSET
         * 
         * 如果页码从1开始算，name对应的记录应该 LIMIT 3 OFFSET （页码 -1）* 3
         * 
         * 总页码
         */
        const page = Number(ctx.query.page) || 1 // 这个page 其实应该有前端来决定是多少
        const prepage = Number(ctx.query.prepage) || 4
        let type = ctx.query.type;
        let where = ''
        if (type) {
            where = 'WHERE done=' + type
        }
        // 查询总的记录条数
        const sql1 = `SELECT title,done,id FROM todos ${where}`
        const [todosAll] = await connection.query(sql1);
        // 总的数据量 / 每页显示条数 ,注意小数
        const pages = Math.ceil(todosAll.length / prepage)

        // where ??=? ??: 表示字段或表名 ?: 表示值
        const sql2 = `SELECT title,done,id FROM todos ${where} LIMIT ? OFFSET ?`
        const [data] = await connection.query(sql2, [prepage, (page - 1) * prepage]);
        ctx.body = {
            code: 0,
            data: {
                page,
                prepage,
                pages,
                todos: data
            }
        }
    })
    router.post('/add', async ctx => {
        const title = ctx.request.body.title
        if (title == '') {
            ctx.body = {
                code: 1,
                data: 'title 不能为空'
            }
            return
        }
        const [rs] = await connection.query(`INSERT INTO todos (title,done) VALUES ('${title}',0)`)
        if (rs.affectedRows > 0) {
            ctx.body = {
                code: 0,
                data: '添加成功'
            }
        } else {
            ctx.body = {
                code: 1,
                data: '添加失败'
            }
        }
    })

    router.post('/toggle', async ctx => {
        const id = Number(ctx.request.body.id) || 0
        const todo = Number(ctx.request.body.todo) || 0

        let sql = "UPDATE todos SET ??=? WHERE ??=?"
        let [rs] = await connection.query(sql, ['done', todo, 'id', id])

        if (rs.affectedRows > 0) {
            ctx.body = {
                code: 0,
                data: '更新成功'
            }
        } else {
            ctx.body = {
                code: 1,
                data: '更新失败'
            }
        }
    })

    router.post('/remove', async ctx => {
        const id = Number(ctx.request.body.id) || 0

        let sql = "DELETE FROM todos WHERE ??=?"
        let [rs] = await connection.query(sql, ['id', id])

        if (rs.affectedRows > 0) {
            ctx.body = {
                code: 0,
                data: '删除成功'
            }
        } else {
            ctx.body = {
                code: 1,
                data: '删除失败'
            }
        }
    })
    app.use(router.routes())
    app.listen(80)
})()