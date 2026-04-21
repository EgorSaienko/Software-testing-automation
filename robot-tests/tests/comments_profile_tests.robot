*** Settings ***
Documentation       Тести коментарів та профілю користувача
Library             SeleniumLibrary
Resource            ../resources/common.resource
Resource            ../resources/auth.resource
Resource            ../resources/posts.resource
Suite Setup         Run Keywords
...                 Open Browser To Home Page    AND
...                 Log In As    ${TEST_EMAIL}    ${TEST_PASSWORD}
Suite Teardown      Close All Browsers

*** Test Cases ***

TC-19 Додавання коментаря до запису
    [Documentation]    Авторизований користувач може залишити коментар
    [Tags]    comments    create    positive
    Go To    ${BASE_URL}/posts
    Click Link    css:.post-card:first-child .btn
    Scroll Element Into View    css:#comments
    Input Text    css:#comments textarea[name='content']    Robot Framework автоматичний коментар
    Click Button    css:#comments button[type='submit']
    Wait Until Page Contains    Robot Framework автоматичний коментар    timeout=5s

TC-20 Коментар без тексту не відправляється
    [Documentation]    Негативний тест — порожній коментар
    [Tags]    comments    create    negative    validation
    Go To    ${BASE_URL}/posts
    Click Link    css:.post-card:first-child .btn
    ${url}=    Get Location
    Scroll Element Into View    css:#comments
    Click Button    css:#comments button[type='submit']
    Location Should Be    ${url}

TC-21 Видалення власного коментаря
    [Documentation]    Автор може видалити свій коментар
    [Tags]    comments    delete    positive
    Go To    ${BASE_URL}/posts
    Click Link    css:.post-card:first-child .btn
    Scroll Element Into View    css:#comments
    Input Text    css:#comments textarea[name='content']    Коментар для видалення
    Click Button    css:#comments button[type='submit']
    Wait Until Page Contains    Коментар для видалення    timeout=5s
    ${delete_btn}=    Get WebElement    css=.comment:last-child .btn-ghost-sm
    Click Element    ${delete_btn}
    Page Should Not Contain    Коментар для видалення

TC-22 Перегляд власного профілю
    [Documentation]    Авторизований користувач бачить свій профіль
    [Tags]    profile    read    positive
    Go To    ${BASE_URL}/profile
    Title Should Be    Профіль — ${TEST_USERNAME} | Блог
    Page Should Contain Element    css:.profile-username
    Element Text Should Be    css:.profile-username    ${TEST_USERNAME}
    Page Should Contain Element    css:.profile-actions

TC-23 Редагування профілю — оновлення біо
    [Documentation]    Користувач може оновити своє біо
    [Tags]    profile    update    positive
    Go To    ${BASE_URL}/profile/edit
    Title Should Be    Редагувати профіль | Блог
    Clear Element Text    id:bio
    Input Text    id:bio    Robot Framework — автоматично оновлений біо профіль.
    Click Button    css:button[type='submit']
    Wait Until Location Contains    /profile    timeout=5s
    Flash Message Should Be Success
    Page Should Contain    Robot Framework — автоматично оновлений біо профіль.

TC-24 Редагування профілю — занадто довге біо
    [Documentation]    Негативний тест — біо більше 500 символів
    [Tags]    profile    update    negative    validation
    Go To    ${BASE_URL}/profile/edit
    ${long_bio}=    Set Variable    ${'A' * 501}
    Clear Element Text    id:bio
    Input Text    id:bio    ${long_bio}
    Click Button    css:button[type='submit']
    Page Should Contain Element    css:.error-list

TC-25 Публічний профіль іншого користувача
    [Documentation]    Сторінка /profile/users/<username> публічно доступна
    [Tags]    profile    read    positive
    Go To    ${BASE_URL}/profile/users/${TEST_USERNAME}
    Page Should Contain Element    css:.profile-username
    Element Text Should Be    css:.profile-username    ${TEST_USERNAME}
    Page Should Not Contain Element    css:.profile-actions

TC-26 Зміна паролю
    [Documentation]    Авторизований користувач може змінити пароль
    [Tags]    profile    password    positive
    Go To    ${BASE_URL}/auth/change-password
    Title Should Be    Змінити пароль | Блог
    Input Text    id:currentPassword    ${TEST_PASSWORD}
    Input Text    id:newPassword        NewTestPass456!
    Input Text    id:confirmPassword    NewTestPass456!
    Click Button    css:button[type='submit']
    Wait Until Location Contains    /profile    timeout=5s
    Flash Message Should Be Success
    [Teardown]    Restore Password    NewTestPass456!    ${TEST_PASSWORD}
