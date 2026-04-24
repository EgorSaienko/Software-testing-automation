'use strict';

const { Given, When, Then } = require('@cucumber/cucumber');
const { By } = require('selenium-webdriver');

// ── Локатори (централізовано — аналог Page Object для BDD) ───────────────────
const L = {
  postsGrid:       By.css('.posts-grid'),
  postCards:       By.css('.post-card'),
  firstPostLink:   By.css('.post-card:first-child .btn'),
  emptyState:      By.css('.empty-state'),
  searchInput:     By.css('.search-input'),
  searchButton:    By.css('.search-btn'),
  postTitle:       By.css('.post-title'),
  postContent:     By.css('.post-content'),
  commentsSection: By.css('#comments'),
  commentTextarea: By.css('#comments textarea[name="content"]'),
  commentSubmit:   By.css('#comments button[type="submit"]'),
  titleInput:      By.id('title'),
  contentInput:    By.id('content'),
  submitButton:    By.css("button[type='submit']"),
  editButton:      By.linkText('Редагувати'),
  deleteButton:    By.css('.btn-danger'),
  errorList:       By.css('.error-list'),
};

// ── Given ──────────────────────────────────────────────────────────────────────

Given('існує запис з заголовком {string} та вмістом {string}', async function (title, content) {
  await this.createPost(title, content);
  await this.waitForUrl('/posts/');
});

// ── When ───────────────────────────────────────────────────────────────────────

When('він відкриває сторінку записів', async function () {
  await this.navigate('/posts');
});

When('він клікає на перший запис у списку', async function () {
  await this.click(L.firstPostLink, 'first_post');
  await this.waitForUrl('/posts/');
});

When('він вводить у пошук {string}', async function (query) {
  await this.type(L.searchInput, query, 'search_input');
});

When('він натискає кнопку пошуку', async function () {
  await this.click(L.searchButton, 'search_btn');
});

When('він відкриває форму створення запису', async function () {
  await this.navigate('/posts/new');
});

When('він вводить заголовок запису {string}', async function (title) {
  await this.type(L.titleInput, title, 'post_title');
});

When('він вводить вміст запису {string}', async function (content) {
  await this.type(L.contentInput, content, 'post_content');
});

When('він натискає кнопку збереження запису', async function () {
  await this.click(L.submitButton, 'save_post');
});

When('він клікає кнопку редагування запису', async function () {
  await this.click(L.editButton, 'edit_post');
  await this.waitForUrl('/edit');
});

When('він змінює заголовок на {string}', async function (newTitle) {
  await this.type(L.titleInput, newTitle, 'update_title');
});

When('він натискає кнопку видалення запису', async function () {
  await this.click(L.deleteButton, 'delete_post');
});

When('він вводить коментар {string}', async function (text) {
  await this.scrollTo(L.commentsSection);
  await this.type(L.commentTextarea, text, 'comment_text');
});

When('він відправляє коментар', async function () {
  await this.click(L.commentSubmit, 'comment_submit');
});

When('він відправляє порожній коментар', async function () {
  await this.scrollTo(L.commentsSection);
  // Textarea порожня — просто клікаємо submit
  await this.click(L.commentSubmit, 'empty_comment_submit');
});

// ── Then ───────────────────────────────────────────────────────────────────────

Then('сторінка має відображати список записів', async function () {
  const hasGrid = await this.isPresent(L.postsGrid);
  if (!hasGrid) {
    throw new Error('Posts grid not found on the page');
  }
});

Then('на сторінці є хоча б один запис', async function () {
  const cards = await this.findElements(L.postCards);
  if (cards.length === 0) {
    throw new Error('No post cards found on the page');
  }
});

Then('має відображатись заголовок запису', async function () {
  const hasTitle = await this.isPresent(L.postTitle);
  if (!hasTitle) {
    throw new Error('Post title not found');
  }
});

Then('має відображатись вміст запису', async function () {
  const hasContent = await this.isPresent(L.postContent);
  if (!hasContent) {
    throw new Error('Post content not found');
  }
});

Then('має відображатись секція коментарів', async function () {
  const hasComments = await this.isPresent(L.commentsSection);
  if (!hasComments) {
    throw new Error('Comments section not found');
  }
});

Then('URL має містити параметр пошуку {string}', async function (query) {
  const url = await this.getCurrentUrl();
  const encoded = encodeURIComponent(query).replace(/%20/g, '+');
  if (!url.includes(query) && !url.includes(encoded)) {
    throw new Error(`URL "${url}" does not contain search query "${query}"`);
  }
});

Then('має відображатись порожній стан', async function () {
  const hasEmpty = await this.isPresent(L.emptyState);
  if (!hasEmpty) {
    throw new Error('Empty state not found — search may have returned results');
  }
});

Then('він має бути перенаправлений на сторінку запису', async function () {
  await this.waitForUrl('/posts/');
  const url = await this.getCurrentUrl();
  if (!url.includes('/posts/') || url.includes('/new') || url.includes('/edit')) {
    throw new Error(`Expected to be on a post page, got: ${url}`);
  }
});

Then('він залишається на сторінці створення запису', async function () {
  const url = await this.getCurrentUrl();
  if (!url.includes('/new') && !url.includes('/posts/new')) {
    throw new Error(`Expected to stay on /posts/new, got: ${url}`);
  }
});

Then('він залишається на сторінці запису', async function () {
  const url = await this.getCurrentUrl();
  if (!url.includes('/posts/')) {
    throw new Error(`Expected to stay on a post page, got: ${url}`);
  }
});

Then('заголовок запису має бути {string}', async function (expectedTitle) {
  const actualTitle = await this.getText(L.postTitle);
  if (actualTitle !== expectedTitle) {
    throw new Error(`Expected title "${expectedTitle}", got "${actualTitle}"`);
  }
});

Then('коментар {string} має відображатись на сторінці', async function (commentText) {
  const pageSource = await this.driver.getPageSource();
  if (!pageSource.includes(commentText)) {
    throw new Error(`Comment "${commentText}" not found on the page`);
  }
});
