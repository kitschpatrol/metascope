# -*- encoding: utf-8 -*-
# stub: taxjar-model_attribute 3.1.0 ruby lib

Gem::Specification.new do |s|
  s.name = "taxjar-model_attribute".freeze
  s.version = "3.1.0"

  s.required_rubygems_version = Gem::Requirement.new(">= 0".freeze) if s.respond_to? :required_rubygems_version=
  s.require_paths = ["lib".freeze]
  s.authors = ["Jake Johnson".freeze]
  s.date = "2015-11-20"
  s.description = "    Attributes for non-ActiveRecord models.\n    Smaller and simpler than Virtus, and adds dirty tracking.\n    Extends David Waller's original gem model_attribute with more types.\n".freeze
  s.email = ["jake@taxjar.com".freeze]
  s.homepage = "".freeze
  s.licenses = ["MIT".freeze]
  s.rubygems_version = "2.7.7".freeze
  s.summary = "Attributes for non-ActiveRecord models".freeze

  s.installed_by_version = "2.7.7" if s.respond_to? :installed_by_version

  if s.respond_to? :specification_version then
    s.specification_version = 4

    if Gem::Version.new(Gem::VERSION) >= Gem::Version.new('1.2.0') then
      s.add_development_dependency(%q<bundler>.freeze, ["~> 1.7"])
      s.add_development_dependency(%q<rake>.freeze, ["~> 10.0"])
      s.add_development_dependency(%q<rspec>.freeze, ["~> 3.1"])
      s.add_development_dependency(%q<rspec-nc>.freeze, ["~> 0.2"])
      s.add_development_dependency(%q<guard>.freeze, ["~> 2.8"])
      s.add_development_dependency(%q<guard-rspec>.freeze, ["~> 4.3"])
    else
      s.add_dependency(%q<bundler>.freeze, ["~> 1.7"])
      s.add_dependency(%q<rake>.freeze, ["~> 10.0"])
      s.add_dependency(%q<rspec>.freeze, ["~> 3.1"])
      s.add_dependency(%q<rspec-nc>.freeze, ["~> 0.2"])
      s.add_dependency(%q<guard>.freeze, ["~> 2.8"])
      s.add_dependency(%q<guard-rspec>.freeze, ["~> 4.3"])
    end
  else
    s.add_dependency(%q<bundler>.freeze, ["~> 1.7"])
    s.add_dependency(%q<rake>.freeze, ["~> 10.0"])
    s.add_dependency(%q<rspec>.freeze, ["~> 3.1"])
    s.add_dependency(%q<rspec-nc>.freeze, ["~> 0.2"])
    s.add_dependency(%q<guard>.freeze, ["~> 2.8"])
    s.add_dependency(%q<guard-rspec>.freeze, ["~> 4.3"])
  end
end
