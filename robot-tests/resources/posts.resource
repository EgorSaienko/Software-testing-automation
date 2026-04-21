*** Settings ***
Documentation    Ключові слова для роботи з постами та коментарями
Library          SeleniumLibrary
Resource         common.resource

*** Keywords ***
Create Post And Navigate
    [Documentation]    Створює новий запис та переходить на його сторінку
    [Arguments]    ${title}    ${content}
    Go To    ${BASE_URL}/posts/new
    Input Text    id:title      ${title}
    Input Text    id:content    ${content}
    Click Button    css:button[type='submit']
    Wait Until Page Contains Element    css:.post-title    timeout=5s

Create Post With Tag
    [Documentation]    Створює запис (з тегом у назві для унікальності)
    [Arguments]    ${tag}
    ${title}=    Set Variable    Test Post [${tag}]
    ${content}=    Set Variable    Автоматично згенерований контент для тесту з тегом ${tag}.
    Create Post And Navigate    ${title}    ${content}
    RETURN    ${title}

Post Should Exist On Page
    [Documentation]    Перевіряє наявність заголовку поста на сторінці
    [Arguments]    ${title}
    Page Should Contain    ${title}

Post Should Not Exist On Page
    [Documentation]    Перевіряє відсутність заголовку поста
    [Arguments]    ${title}
    Page Should Not Contain    ${title}

Add Comment To Current Post
    [Documentation]    Додає коментар до поточного відкритого поста
    [Arguments]    ${comment_text}
    Scroll Element Into View    css:#comments
    Input Text    css:#comments textarea[name='content']    ${comment_text}
    Click Button    css:#comments button[type='submit']
    Wait Until Page Contains    ${comment_text}    timeout=5s

Comment Should Be Visible
    [Documentation]    Перевіряє що коментар відображається на сторінці
    [Arguments]    ${comment_text}
    Page Should Contain    ${comment_text}
