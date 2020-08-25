var express = require('express');
var router = express.Router();
const Book = require('../models').Book;
const Sequelize = require('sequelize');
const { Op } = require("sequelize");

/* Handler function to wrap each route. */
function asyncHandler(cb){
  return async(req, res, next) => {
    try {
      await cb(req, res, next)
    } catch(error){
      // res.render("error", {error})
      res.status(404).render("books/page-not-found", {error, title:"ERROR"})
}}}

//Creat array of page numbers
function paginate(count){
  const array = Array.from(new Array(count), (x, i) => i);
  return array
}

// Redirect to the book list
router.get('/', asyncHandler(async (req, res) => {
  res.redirect("books/allbooks/page/1");
}));

//display all books
router.get('/allbooks/page/:page', asyncHandler(async (req, res) => {
  const books = await Book.findAll({ offset: ((req.params.page * 5)-5), limit: 5, order: [["createdAt", "DESC"]]});
  //Counts the number of books in the database to generate page numbers at 5 to a page
  const page_count = await Book.count()/5
  res.render("books/index", {books, title:"Library", sQuery:"allbooks", page_count: paginate(Math.ceil(page_count)), currentPage:req.params.page, bookSearch: {}, pageLink: "/books/" });
}));

// Shows the create new book form.
router.get('/new', (req, res) => {
  res.render("books/new-book", { book: {}, title: "New Book" });
});

//Search for book, takes the search parameter from the url and adds to the db filter when getting names
router.get('/search/:searchquery/page/:page', asyncHandler(async (req, res) => {
  const search = req.params.searchquery;
  const searchDB= { 
    where: {
      [Op.or]:[
        {title: {[Op.like]: '%' + search + '%'}},  
        {author:{[Op.like]: '%' + search + '%'}},
        {genre:{[Op.like]: '%' + search + '%'}},
        {year:{[Op.like]: '%' + search + '%'}},
      ]
    }, 
    offset: ((req.params.page * 5)-5),
    limit: 5, 
    order: [["createdAt", "DESC"]]};
  //use the searchDB query to get matching records from the database and then count them using the same variable
  const books = await Book.findAll(searchDB);
  const page_count = await Book.count(searchDB)/5;
  if (page_count){
    res.render("books/index", {books, title:"Library-Search", sQuery:req.params.searchquery, page_count: paginate(Math.ceil(page_count)), currentPage: req.params.page, bookSearch: {}, pageLink: "/books/search/"});
  }else {
    res.locals.message = "No books have been found from that search";
    throw new Error(404);
  }
}));

// post /books/search - Search books on the database.
router.post('/', asyncHandler(async (req, res) => {
  let search;
    search = req.body;
    res.redirect("/books/search/" + search.search + "/page/1");
}));

// post /books/new - Posts a new book to the database.
router.post('/new', asyncHandler(async (req, res) => {
  let book;
  try {
    book = await Book.create(req.body);
    res.redirect("/books/" + book.id + "/edit");
  } catch (error) {
    if(error.name === "SequelizeValidationError") { // checking the error
      book = await Book.build(req.body);
      res.render("books/new-book", { book, errors: error.errors, title: "New Book" })
    } else {
      throw error; 
    }  
  }
}));

// Shows book detail.
router.get("/:id", asyncHandler(async (req, res) => {
  const book = await Book.findByPk(req.params.id);
  if(book) {
    res.render("books/update-book", { book, title: book.title });  
  } else {
    res.locals.message = "I do not have that book";
    throw new Error(404);
  }
})); 

// Edit book detail form.
router.get("/:id/edit", asyncHandler(async (req, res) => {
  const book = await Book.findByPk(req.params.id);
  if(book) {
    res.render("books/update-book", { book, title: book.title });  
  } else {
    res.locals.message = "I do not have that book";
    throw new Error(404);
  }
})); 


// post /books/:id - Updates book info in the database.
router.post('/:id/edit', asyncHandler(async (req, res) => {
  let book;
  try {
    book = await Book.findByPk(req.params.id);
    if(book) {
      await book.update(req.body);
      res.redirect("/books"); 
    } else {
      throw error; 
    }
  } catch (error) {
    if(error.name === "SequelizeValidationError") {
      book = await Book.build(req.body);
      book.id = req.params.id; // make sure correct book gets updated
      res.render("books/update-book", { book, errors: error.errors, title: "Edit Book" })
    } else {
      throw error;
    }
  }
}));

// elete - Deletes a book. Careful, this can’t be undone. It can be helpful to create a new “test” book to test deleting.
router.post('/:id/delete', asyncHandler(async (req ,res) => {
  const book = await Book.findByPk(req.params.id);
  if(book) {
    await book.destroy();
    res.redirect("/books");
  } else {
    throw error; 
  }
}));

module.exports = router;
