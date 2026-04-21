*** Settings ***
Documentation       Тести управління записами (posts) блог-застосунку
...                 Покриває: створення, перегляд, редагування, видалення, пошук
Library             SeleniumLibrary
Resource            ../resources/common.resource
Resource            ../resources/auth.resource
Resource            ../resources/posts.resource
Suite Setup         Run Keywords
...                 Open Browser To Home Page    AND
...                 Log In As    ${TEST_EMAIL}    ${TEST_PASSWORD}
Suite Teardown      Close All Browsers

*** Test Cases ***

TC-10 Перегляд списку записів
    [Documentation]    Головна сторінка /posts відображає список записів
    [Tags]    posts    read    positive
    Go To    ${BASE_URL}/posts
    Title Should Be    Блог | Блог
    Page Should Contain Element    css:.posts-grid
    Page Should Contain Element    css:.post-card

TC-11 Створення нового запису
    [Documentation]    Авторизований користувач може створити запис
    [Tags]    posts    create    positive
    Go To    ${BASE_URL}/posts/new
    Title Should Be    Новий запис | Блог
    Input Text    id:title      Robot Framework Test Post
    Input Text    id:content    Цей запис створено автоматично за допомогою Robot Framework keyword-driven тестів.
    Click Button    css:button[type='submit']
    Wait Until Page Contains Element    css:.post-title    timeout=5s
    Element Text Should Be    css:.post-title    Robot Framework Test Post
    Flash Message Should Be Success

TC-12 Створення запису без заголовку
    [Documentation]    Негативний тест — форма вимагає заголовок
    [Tags]    posts    create    negative    validation
    Go To    ${BASE_URL}/posts/new
    Input Text    id:content    Контент без заголовку
    Click Button    css:button[type='submit']
    Location Should Be    ${BASE_URL}/posts/new

TC-13 Створення запису з занадто коротким заголовком
    [Documentation]    Негативний тест — заголовок менше 3 символів
    [Tags]    posts    create    negative    validation
    Go To    ${BASE_URL}/posts/new
    Input Text    id:title      AB
    Input Text    id:content    Достатньо довгий контент для тесту.
    Click Button    css:button[type='submit']
    Page Should Contain Element    css:.error-list

TC-14 Пошук записів за ключовим словом
    [Documentation]    Пошук знаходить відповідні записи
    [Tags]    posts    search    positive
    Go To    ${BASE_URL}/posts
    Input Text    css:.search-input    Robot Framework
    Click Button    css:.search-btn
    URL Should Contain    search=Robot+Framework
    Page Should Contain Element    css:.post-card

TC-15 Пошук без результатів
    [Documentation]    Пошук неіснуючого слова показує порожній стан
    [Tags]    posts    search    negative
    Go To    ${BASE_URL}/posts
    Input Text    css:.search-input    xyznonexistentterm123
    Click Button    css:.search-btn
    Page Should Contain Element    css:.empty-state

TC-16 Перегляд окремого запису
    [Documentation]    Клік на запис відкриває повну сторінку
    [Tags]    posts    read    positive
    Go To    ${BASE_URL}/posts
    Click Link    css:.post-card:first-child .btn
    Page Should Contain Element    css:.post-title
    Page Should Contain Element    css:.post-content
    Page Should Contain Element    css:.comments-section

TC-17 Редагування власного запису
    [Documentation]    Автор може редагувати свій запис
    [Tags]    posts    update    positive
    Create Post And Navigate    Robot Edit Test    Контент для редагування.
    Click Link    Редагувати
    Wait Until Page Contains Element    id:title    timeout=3s
    Clear Element Text    id:title
    Input Text    id:title    Robot Edit Test — Оновлено
    Click Button    css:button[type='submit']
    Wait Until Page Contains Element    css:.post-title    timeout=5s
    Element Text Should Be    css:.post-title    Robot Edit Test — Оновлено

TC-18 Видалення власного запису
    [Documentation]    Автор може видалити свій запис
    [Tags]    posts    delete    positive
    Create Post And Navigate    Robot Delete Test    Контент для видалення.
    ${url}=    Get Location
    Click Button    css=.btn-danger[data-confirm]
    Wait Until Location Contains    /posts    timeout=5s
    Go To    ${url}
    Page Should Contain Element    css:.error-page
