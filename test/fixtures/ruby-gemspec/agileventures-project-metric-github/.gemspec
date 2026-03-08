# -*- encoding: utf-8 -*-
# stub: github_project_metrics 0.0.9 ruby lib

Gem::Specification.new do |s|
  s.name = "project_metric_github"
  s.version = "0.0.9"

  s.required_rubygems_version = Gem::Requirement.new(">= 0") if s.respond_to? :required_rubygems_version=
  s.require_paths = ["lib"]
  s.authors = ["Sam Joseph"]
  s.date = "2016-07-21"
  s.description = "Project metrics from github"
  s.email = "sam@agileventues.org"
  s.files = ["lib/project_metric_github.rb"]
  s.homepage = "https://github.com/AgileVentures/project_metric_github"
  s.licenses = ["MIT"]
  s.rubygems_version = "2.5.1"
  s.summary = "ProjectMetricGithub"

  if s.respond_to? :specification_version then
    s.specification_version = 4

    if Gem::Version.new(Gem::VERSION) >= Gem::Version.new('1.2.0') then
      s.add_runtime_dependency(%q<octokit>, [">= 0"])
      s.add_development_dependency(%q<rspec>, ["= 3.4"])
      s.add_development_dependency(%q<vcr>, [">= 0"])
      s.add_development_dependency(%q<webmock>, [">= 0"])
      s.add_development_dependency(%q<byebug>, [">= 0"])
    else
      s.add_dependency(%q<octokit>, [">= 0"])
      s.add_dependency(%q<rspec>, ["= 3.4"])
      s.add_dependency(%q<vcr>, [">= 0"])
      s.add_dependency(%q<webmock>, [">= 0"])
      s.add_dependency(%q<byebug>, [">= 0"])
    end
  else
    s.add_dependency(%q<octokit>, [">= 0"])
    s.add_dependency(%q<rspec>, ["= 3.4"])
    s.add_dependency(%q<vcr>, [">= 0"])
    s.add_dependency(%q<webmock>, [">= 0"])
    s.add_dependency(%q<byebug>, [">= 0"])
  end
end
