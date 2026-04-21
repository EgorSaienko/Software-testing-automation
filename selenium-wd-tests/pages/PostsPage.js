'use strict';

const { By } = require('selenium-webdriver');
const BasePage = require('./BasePage');

/**
 * PostsPage — Page Object для /posts (список) та /posts/new
 */
class PostsPage extends BasePage {
  constructor(driver) {
    super(driver);

    this.locators = {
      // Список постів
      postsGrid:      By.css('.posts-grid'),
      postCards:      By.css('.post-card'),
      emptyState:     By.css('.empty-state'),
      searchInput:    By.css('.search-input'),
      searchButton:   By.css('.search-btn'),
      firstPostLink:  By.css('.post-card:first-child .btn'),

      // Форма створення/редагування
      titleInput:     By.id('title'),
      contentInput:   By.id('content'),
      submitButton:   By.css("button[type='submit']"),
      errorList:      By.css('.error-list'),

      // Сторінка поста
      postTitle:      By.css('.post-title'),
      postContent:    By.css('.post-content'),
      editButton:     By.linkText('Редагувати'),
      deleteButton:   By.css(".btn-danger[data-confirm]"),

      // Коментарі
      commentsSection:  By.css('#comments'),
      commentTextarea:  By.css('#comments textarea[name="content"]'),
      commentSubmit:    By.css('#comments button[type="submit"]'),
      commentItems:     By.css('.comment'),
      lastCommentText:  By.css('.comment:last-child .comment-text'),
    };
  }

  async openList() {
    await this.navigate('/posts');
  }

  async openNewPostForm() {
    await this.navigate('/posts/new');
  }

  async isGridVisible() {
    return await this.isElementPresent(this.locators.postsGrid);
  }

  async getPostCardsCount() {
    const cards = await this.driver.findElements(this.locators.postCards);
    return cards.length;
  }

  async search(query) {
    await this.typeText(this.locators.searchInput, query, 'search_query');
    await this.clickElement(this.locators.searchButton, 'search_submit');
    await this.takeScreenshot(`search_results_${query.replace(/\s/g, '_')}`);
  }

  async createPost(title, content) {
    await this.openNewPostForm();
    await this.typeText(this.locators.titleInput, title, 'post_title');
    await this.typeText(this.locators.contentInput, content, 'post_content');
    await this.clickElement(this.locators.submitButton, 'create_post_submit');
    await this.takeScreenshot('after_create_post');
  }

  async getPostTitle() {
    return await this.getText(this.locators.postTitle);
  }

  async clickFirstPost() {
    await this.clickElement(this.locators.firstPostLink, 'open_first_post');
  }

  async clickEdit() {
    await this.clickElement(this.locators.editButton, 'click_edit');
  }

  async clickDelete() {
    await this.clickElement(this.locators.deleteButton, 'click_delete');
    await this.takeScreenshot('after_delete');
  }

  async hasError() {
    return await this.isElementPresent(this.locators.errorList);
  }

  async addComment(text) {
    await this.waitForElement(this.locators.commentsSection);

    // Scroll to comments
    const commentsEl = await this.findElement(this.locators.commentsSection);
    await this.driver.executeScript(
      'arguments[0].scrollIntoView(true)',
      commentsEl
    );

    await this.typeText(this.locators.commentTextarea, text, 'comment_text');
    await this.clickElement(this.locators.commentSubmit, 'comment_submit');
    await this.takeScreenshot('after_add_comment');
  }

  async getLastCommentText() {
    return await this.getText(this.locators.lastCommentText);
  }

  async isEmptyStateVisible() {
    return await this.isElementPresent(this.locators.emptyState);
  }
}

module.exports = PostsPage;
