// 年齢を自動計算して表示
window.addEventListener("DOMContentLoaded", () => {
    const birthdayText = document.getElementById("birthday").textContent;
    const ageField = document.getElementById("age");

    const birthDate = new Date(birthdayText);
    const today = new Date();

    let age = today.getFullYear() - birthDate.getFullYear();

    // 誕生日がまだ来ていなければ -1
    const hasBirthdayPassed =
        today.getMonth() > birthDate.getMonth() ||
        (today.getMonth() === birthDate.getMonth() && today.getDate() >= birthDate.getDate());

    if (!hasBirthdayPassed) age--;

    ageField.textContent = age + "歳";
});
