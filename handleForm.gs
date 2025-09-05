// دوال خاصة لخدمة الويب
function doGet() {
  return HtmlService.createHtmlOutputFromFile('index');
}

// دالة لجلب جميع البيانات اللازمة للقوائم المنسدلة
function getAllDropdownData() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var absentTeachersSheet = ss.getSheetByName("المعلمة الغائبة");
  var substituteTeachersSheet = ss.getSheetByName("المعلمة البديلة");
  var classSheet = ss.getSheetByName("الصف");
  var subjectSheet = ss.getSheetByName("المادة");
  var periodSheet = ss.getSheetByName("الحصة");
  var daySheet = ss.getSheetByName("اليوم");

  var absentTeachersList = absentTeachersSheet ? absentTeachersSheet.getRange("A2:A" + absentTeachersSheet.getLastRow()).getValues().map(row => row[0]).filter(name => name !== "") : [];
  var substituteTeachersList = substituteTeachersSheet ? substituteTeachersSheet.getRange("A2:B" + substituteTeachersSheet.getLastRow()).getValues().map(row => ({ name: row[0], phone: row[1] })).filter(teacher => teacher.name !== "") : [];
  var classesList = classSheet ? classSheet.getRange("A2:A" + classSheet.getLastRow()).getValues().map(row => row[0]).filter(cls => cls !== "") : [];
  var subjectsList = subjectSheet ? subjectSheet.getRange("A2:A" + subjectSheet.getLastRow()).getValues().map(row => row[0]).filter(sub => sub !== "") : [];
  var periodsList = periodSheet ? periodSheet.getRange("A2:A" + periodSheet.getLastRow()).getValues().map(row => row[0]).filter(per => per !== "") : [];
  var daysList = daySheet ? daySheet.getRange("A2:A" + daySheet.getLastRow()).getValues().map(row => row[0]).filter(day => day !== "") : [];

  return {
    absentTeachers: absentTeachersList,
    substituteTeachers: substituteTeachersList,
    classes: classesList,
    subjects: subjectsList,
    periods: periodsList,
    days: daysList
  };
}

// دالة لمعالجة البيانات المرسلة من النموذج
function processForm(formObject) {
  var mainSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("سجل الاحتياط");
  var folderId = "1B84yTiEqfNqdsTddqQP6cXohfQnnBU8-";
  var imageFormula = '';

  try {
    var base64Data = formObject.التوقيع.split(',')[1];
    var signatureBlob = Utilities.newBlob(Utilities.base64Decode(base64Data), 'image/png', 'signature_' + new Date().getTime() + '.png');
    var folder = DriveApp.getFolderById(folderId);
    var signatureFile = folder.createFile(signatureBlob);
    
    signatureFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    var signatureUrl = signatureFile.getUrl();
    imageFormula = '=IMAGE("' + signatureUrl + '")';

  } catch (e) {
    Logger.log("خطأ في معالجة التوقيع أو مجلد Drive: " + e.message);
    imageFormula = 'خطأ في التوقيع: ' + e.message;
  }

  if (mainSheet) {
    var rowData = [
      formObject.التاريخ,
      formObject.اليوم,
      formObject.الحصة,
      formObject.الصف,
      formObject.المادة,
      formObject.المعلمة_الغائبة,
      formObject.المعلمة_البديلة,
      "",
      formObject.رقم_الهاتف
    ];

    mainSheet.appendRow(rowData);
    
    var lastRow = mainSheet.getLastRow();
    var signatureCell = mainSheet.getRange(lastRow, 8);
    signatureCell.setFormula(imageFormula);
    
    // هنا يبدأ كود إرسال رسالة واتساب
    var accountSid = 'ACddf8b9d6943509cd3d0f3cc5a398afaa';
    var authToken = '5d99903a90ad3bdcf57c104f8dcb8499';
    var fromNumber = 'whatsapp:+14155238886';
    var toPhoneNumber = 'whatsapp:+968' + formObject.رقم_الهاتف;
    var message = 'تم تسجيل احتياط جديد:\n' +
                  'التاريخ: ' + formObject.التاريخ + '\n' +
                  'اليوم: ' + formObject.اليوم + '\n' +
                  'الحصة: ' + formObject.الحصة + '\n' +
                  'الصف: ' + formObject.الصف + '\n' +
                  'المادة: ' + formObject.المادة + '\n' +
                  'المعلمة الغائبة: ' + formObject.المعلمة_الغائبة + '\n' +
                  'المعلمة البديلة: ' + formObject.المعلمة_البديلة;

    try {
      var options = {
        'method' : 'post',
        'contentType': 'application/x-www-form-urlencoded;charset=UTF-8',
        'headers': {
          'Authorization': 'Basic ' + Utilities.base64Encode(accountSid + ':' + authToken)
        },
        'payload': {
          'To': toPhoneNumber,
          'From': fromNumber,
          'Body': message
        }
      };

      UrlFetchApp.fetch('https://api.twilio.com/2010-04-01/Accounts/' + accountSid + '/Messages.json', options);

    } catch(e) {
      Logger.log('فشل إرسال رسالة واتساب: ' + e.toString());
      return 'تم تسجيل البيانات بنجاح، ولكن فشل إرسال رسالة واتساب.';
    }
    
    return "تم التسجيل بنجاح!";

  } else {
    Logger.log("خطأ: لم يتم العثور على ورقة 'سجل الاحتياط'.");
    return "خطأ: لم يتم العثور على ورقة 'سجل الاحتياط'.";
  }
}
