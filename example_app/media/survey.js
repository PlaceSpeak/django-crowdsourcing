function loadSurvey(slug, elementId) {
  $(document).ready(function() {
    var url = "/crowdsourcing/" + slug + "/api/allowed_actions/";
    $.getJSON(url, function(data, status) {
      loadSurveyForm(slug, elementId, !data["enter"], data["view"]);
    });
  });
}

function loadSurveyForm(slug, elementId, alreadyEntered, canView) {
  var url = "/crowdsourcing/" + slug + "/api/questions/";

  $.getJSON(url, function(survey, status) {
    var isPoll = survey.questions.length == 1 &&
        "radio" == survey.questions[0].option_type;
    var wrapper = initializeWrapper(elementId, isPoll ? "poll" : "survey");
    var beforeWrapper = function(text, element) {
      if (text) {
        wrapper.before(element.html(text));
      }
    };
    beforeWrapper(survey.title, $("<h3/>"));
    beforeWrapper(survey.tease, $("<p/>").addClass("subtitle"));
    beforeWrapper(survey.description, $("<p/>").addClass("description"));
    var form = $("<form/>").attr("method", "POST");
    form.attr("action", survey.submit_url);
    form.addClass(isPoll ? "vote" : "survey").appendTo(wrapper);
    tease = $('#' + elementId).parent().parent();
    if (tease.attr('class') == 'tease') {
      tease.children().eq(0).hide();
    }

    var div = $("<div/>").attr("id", "inner_" + slug).appendTo(form);
    if (alreadyEntered) {
      div.text("You've already entered this survey.");
    } else {
      for (questionI in survey.questions) {
        var question = survey.questions[questionI];
        $("<h2/>").html(question.question).appendTo(div);
        if (isPoll) {
          appendChoiceButtons(survey, question, div);
        } else {
          var p = $("<p/>").appendTo(div);
          if ('radio' == question.option_type) {
            appendRadio(survey, question, p);
          } else if ('photo' == question.option_type) {
            appendInput(survey, question, p, "file");
          } else if ('bool' == question.option_type) {
            appendInput(survey, question, p, "checkbox");
          } else if ('text' == question.option_type) {
            appendTextArea(survey, question, p);
          } else if ('select' == question.option_type) {
            appendSelect(survey, question, p);
          } else { // char, email, video, location, integer, float
            appendInput(survey, question, p, "text");
          }
          if (question["required"]) {
            p.append($("<span />").addClass("required").text("*"));
          }
          if (question.help_text) {
            var label = $("<label/>").addClass("help_text")
            label.html(question.help_text).appendTo(p);
          }
          var error = $("<span/>").addClass("error").appendTo(p).hide();
          error.attr("id", questionId(survey, question) + "_error");
        }
      }
    }
    var submit = $("<input type=\"submit\" />").attr("value", "Submit");
    if (!(isPoll || alreadyEntered)) {
      submit.appendTo(div);
    }
    var error = $("<span />").attr("id", "error_" + slug).addClass("error");
    error.appendTo(div);
    form.ajaxForm({beforeSubmit: function() {
      var valid = validateForm(form, survey);
      if (valid) {
        error.hide();
        submit.attr("value", "Submitting...").attr("disabled", true);
      } else {
        error.html("Fix the problems above.").show();
      }
      return valid;
    }, success: function() {
      $("#inner_" + slug).html("Thanks for responding!");
    }});
    if (canView) {
      appendSeeResults(form, survey);
    }
  });
}

function appendTextArea(survey, question, wrapper) {
  var area = $("<textarea />").attr("cols", 40).attr("rows", 10);
  setNameAndId(area, survey, question);
  area.appendTo(wrapper);
}

function appendSelect(survey, question, wrapper) {
  var select = $("<select />").appendTo(wrapper);
  setNameAndId(select, survey, question);
  var appendOption = function (value, html) {
    $("<option />").attr("value", value).html(html).appendTo(select);
  }
  if (!question["required"]) {
    appendOption("", "-----------");
  }
  for (var i = 0; i < question.options.length; i++) {
    var answer = question.options[i];
    appendOption(answer, answer);
  }
}

function appendInput(survey, question, wrapper, type) {
  var input = $("<input type=\"" + type + "\" />").appendTo(wrapper);
  setNameAndId(input, survey, question);
}

function setNameAndId(element, survey, question) {
  element.attr("id", questionId(survey, question));
  element.attr("name", questionName(survey, question));
}

function appendChoiceButtons(survey, question, wrapper) {
  var answerInput = $("<input type='hidden' />").appendTo(wrapper);
  answerInput.attr("name", questionName(survey, question));
  var ul = $("<ul class='voteList' />").appendTo(wrapper);
  for (var i = 0; i < question.options.length; i++) {
    var answer = question.options[i];
    var li = $("<li/>").appendTo(ul);
    var css = {cursor: "pointer"};
    var a = $("<a/>").attr("href", "#").css(css).html(answer);
    a.appendTo(li).click(function(evt) {
      evt.preventDefault();
      var a = $(this); // Necessary. Review closures if you don't understand.
      answerInput.attr("value", a.html().replace("&amp;", "&"));
      a.parents("form").submit();
    }).mouseover(function() {
      $(this).addClass('surveyRoll');
      $(this).parent().addClass('surveyRoll');
    }).mouseout(function() {
      $(this).removeClass('surveyRoll');
      $(this).parent().removeClass('surveyRoll');
    });
  }
}

function appendRadio(survey, question, wrapper) {
  var answerId = function(i) {
    return questionId(survey, question) + "_" + i;
  };
  var ul = $("<ul/>").appendTo(wrapper);
  for (var i = 0; i < question.options.length; i++) {
    var answer = question.options[i];
    var li = $("<li/>").appendTo(ul);
    var label = $("<label/>").attr("for", answerId(i)).appendTo(li);
    var input = $("<input type='radio' />").attr("id", answerId(i));
    input.attr("name", questionName(survey, question)).attr("value", answer);
    input.appendTo(label);
    label.append(document.createTextNode(" " + answer));
  }
}

function questionName(survey, question) {
  return survey.id + "_" + question["cms_id"] + "-answer";
}

function questionId(survey, question) {
  return "id_" + questionName(survey, question);
}

function appendSeeResults(appendTo, survey) {
  var a = $("<a/>").text("Survey Results");
  a.attr("href", survey.report_url);
  $("<p/>").addClass("results").appendTo(appendTo).append(a);
}

function initializeWrapper(elementId, wrapperClass) {
  var wrapper = $("#" + elementId);
  wrapper.empty().addClass("clearfix").addClass("survey_wrapper");
  wrapper.wrap('<div class="' + wrapperClass + '" />');
  return wrapper;
}

function validateForm(form, survey) {
  var postData = {};
  form.find("input").each(function(i) {
    var input = $(this);
    if (!postData[input.attr("name")]) {
      postData[input.attr("name")] = null;
    }
    if ("radio" == input.attr("type")) {
      if (input.attr("checked")) {
        postData[input.attr("name")] = input.attr("value");
      }
    } else {
      postData[input.attr("name")] = input.attr("value");
    }
  });
  form.find("select").each(function(i) {
    postData[$(this).attr("name")] =
      $(this).find("option:selected").attr("value");
  });
  form.find("textarea").each(function(i) {
    postData[$(this).attr("name")] = $(this).attr("value");
  });
  var valid = true;
  for (questionI in survey.questions) {
    var question = survey.questions[questionI];
    if (question.required && !postData[questionName(survey, question)]) {
      valid = false;
      var id = questionId(survey, question);
      form.find("#" + id + "_error").text("Required").show();
    }
  }
  return valid;
}