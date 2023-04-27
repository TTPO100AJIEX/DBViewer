function get_main(req, res) { return req.authorization ? res.redirect("/database") : res.render("oauth.ejs"); }

function post_oauth(req, res) { return res.login(req.body.login, req.body.password); }
function get_logout(req, res) { return res.logout(); }

const EMPTY_GET_SCHEMA = { querystring: { type: "object", additionalProperties: false, properties: { } } };
export default [
    { method: "GET",  path: "/",       access: "public", schema: EMPTY_GET_SCHEMA, handler: get_main   },
    { method: "POST", path: "/oauth",  access: "public", schema: EMPTY_GET_SCHEMA, handler: post_oauth },
    { method: "GET",  path: "/logout", access: "public", schema: EMPTY_GET_SCHEMA, handler: get_logout }
];