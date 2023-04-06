async function get_database(req, res)
{
    return res.render("database.ejs");
}

export { get_database };