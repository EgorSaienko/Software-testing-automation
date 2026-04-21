*** Settings ***
Documentation       Тести автентифікації блог-застосунку
...                 Покриває: реєстрацію, вхід, вихід, скидання паролю
Library             SeleniumLibrary
Resource            ../resources/common.resource
Resource            ../resources/auth.resource
Suite Setup         Open Browser To Home Page
Suite Teardown      Close All Browsers
Test Setup          Run Keyword If    '${TEST NAME}' != 'TC-01 Реєстрація нового користувача'
...                 Go To    ${BASE_URL}/auth/login

*** Test Cases ***

TC-01 Реєстрація нового користувача
    [Documentation]    Перевіряє успішну реєстрацію нового акаунту
    [Tags]    auth    registration    positive
    Go To    ${BASE_URL}/auth/register
    Page Should Contain Element    id:username
    Input Text    id:username    ${TEST_USERNAME}
    Input Text    id:email       ${TEST_EMAIL}
    Input Text    id:password    ${TEST_PASSWORD}
    Input Text    id:confirmPassword    ${TEST_PASSWORD}
    Click Button    css:button[type='submit']
    Wait Until Location Contains    /posts    timeout=5s
    Flash Message Should Be Success

TC-02 Реєстрація з вже існуючим email
    [Documentation]    Негативний тест — реєстрація з дублікатом email
    [Tags]    auth    registration    negative
    Go To    ${BASE_URL}/auth/register
    Input Text    id:username    other_user_robot
    Input Text    id:email       ${TEST_EMAIL}
    Input Text    id:password    ${TEST_PASSWORD}
    Input Text    id:confirmPassword    ${TEST_PASSWORD}
    Click Button    css:button[type='submit']
    Page Should Contain Element    css:.error-list
    Location Should Be    ${BASE_URL}/auth/register

TC-03 Реєстрація з паролями що не збігаються
    [Documentation]    Негативний тест — різні паролі у формі
    [Tags]    auth    registration    negative    validation
    Go To    ${BASE_URL}/auth/register
    Input Text    id:username    robot_user2
    Input Text    id:email       robot2@example.com
    Input Text    id:password    Password123!
    Input Text    id:confirmPassword    DifferentPass999!
    Click Button    css:button[type='submit']
    Page Should Contain Element    css:.error-list

TC-04 Успішний вхід до системи
    [Documentation]    Перевіряє вхід зареєстрованого користувача
    [Tags]    auth    login    positive
    Log In As    ${TEST_EMAIL}    ${TEST_PASSWORD}
    Wait Until Location Contains    /posts    timeout=5s
    Page Should Contain Element    css:.nav-avatar-link
    Flash Message Should Be Success

TC-05 Вхід з невірним паролем
    [Documentation]    Негативний тест — невірний пароль
    [Tags]    auth    login    negative
    Input Text    id:email       ${TEST_EMAIL}
    Input Text    id:password    WrongPass999
    Click Button    css:button[type='submit']
    Page Should Contain Element    css:.error-list
    Location Should Be    ${BASE_URL}/auth/login

TC-06 Вхід з неіснуючим email
    [Documentation]    Негативний тест — email не зареєстровано
    [Tags]    auth    login    negative
    Input Text    id:email       nobody@nowhere.com
    Input Text    id:password    ${TEST_PASSWORD}
    Click Button    css:button[type='submit']
    Page Should Contain Element    css:.error-list

TC-07 Перехід на сторінку відновлення паролю
    [Documentation]    Перевіряє форму forgot password
    [Tags]    auth    password-reset    positive
    Click Link    Забули пароль?
    Location Should Be    ${BASE_URL}/auth/forgot-password
    Title Should Be    Скидання паролю | Блог
    Input Text    id:email    ${TEST_EMAIL}
    Click Button    css:button[type='submit']
    Page Should Contain Element    css:.success-card

TC-08 Захищений маршрут без авторизації
    [Documentation]    Неавторизований доступ до /posts/new перенаправляє на логін
    [Tags]    auth    security    negative
    Go To    ${BASE_URL}/posts/new
    Wait Until Location Contains    /auth/login    timeout=5s
    Page Should Contain Element    css:.flash-error

TC-09 Вихід з системи
    [Documentation]    Перевіряє коректний вихід із системи
    [Tags]    auth    logout    positive
    Log In As    ${TEST_EMAIL}    ${TEST_PASSWORD}
    Wait Until Location Contains    /posts    timeout=5s
    Log Out
    Location Should Be    ${BASE_URL}/auth/login
    Page Should Contain Link    Реєстрація
